import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Job, Template } from "@/lib/types";
import { generateWithEngine, pickEngineForTier } from "@/lib/engines";
import {
  buildOutputFileName,
  callN8nWebhook,
  parseWorkflowSettings,
  scoreFaceMatch
} from "@/lib/workflow";

interface GenerateBody {
  athleteId: string;
  templateId: string;
}

const uploadGeneratedVideo = async (sourceUrl: string, fileName: string): Promise<string> => {
  try {
    const supabase = getAdminSupabase();
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return sourceUrl;
    }
    const arrayBuffer = await response.arrayBuffer();
    const upload = await supabase.storage
      .from("generated-videos")
      .upload(`jobs/${fileName}`, Buffer.from(arrayBuffer), {
        upsert: true,
        contentType: response.headers.get("content-type") ?? "video/mp4"
      });
    if (upload.error) {
      return sourceUrl;
    }
    const { data } = supabase.storage.from("generated-videos").getPublicUrl(`jobs/${fileName}`);
    return data.publicUrl;
  } catch {
    return sourceUrl;
  }
};

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const payload = await readJsonBody<GenerateBody>(request);
    if (!payload.athleteId || !payload.templateId) {
      return NextResponse.json({ error: "athleteId and templateId are required." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const [{ data: athlete, error: athleteError }, { data: template, error: templateError }, { data: settingsRows, error: settingsError }] =
      await Promise.all([
        supabase.from("athletes").select("*").eq("id", payload.athleteId).single(),
        supabase.from("templates").select("*").eq("id", payload.templateId).single(),
        supabase.from("settings").select("key, value")
      ]);

    if (athleteError || !athlete) {
      return NextResponse.json({ error: athleteError?.message ?? "Athlete not found." }, { status: 404 });
    }
    if (!athlete.consent_signed) {
      return NextResponse.json(
        { error: "Cannot generate content — athlete has not signed a consent and usage release. Update the athlete record after obtaining signed consent." },
        { status: 403 }
      );
    }
    if (templateError || !template) {
      return NextResponse.json({ error: templateError?.message ?? "Template not found." }, { status: 404 });
    }
    if (settingsError) {
      throw new Error(settingsError.message);
    }

    const settingsMap = (settingsRows ?? []).reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    const workflow = parseWorkflowSettings(settingsMap);
    const assembledPrompt = buildVideoPrompt(athlete as Athlete, template as Template);

    // Determine version number based on existing jobs for this athlete+template combo
    const { count: existingCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", payload.athleteId)
      .eq("template_id", payload.templateId);
    const version = (existingCount ?? 0) + 1;

    const outputFilename = buildOutputFileName(
      athlete.name,
      template.category,
      template.location,
      version
    );

    // FUTURE API INTEGRATION POINT:
    // When video engine APIs are connected, use `outputFilename` as the
    // storage object name when uploading to Supabase Storage or Google Drive.
    // Example: await supabase.storage.from('videos').upload(outputFilename, videoBuffer);

    const { data: createdJob, error: createJobError } = await supabase
      .from("jobs")
      .insert({
        athlete_id: athlete.id,
        template_id: template.id,
        status: "queued",
        assembled_prompt: assembledPrompt,
        output_filename: outputFilename,
        retry_count: 0
      })
      .select("*")
      .single();

    if (createJobError || !createdJob) {
      throw new Error(createJobError?.message ?? "Unable to create job.");
    }

    let finalStatus: "approved" | "rejected" | "needs_review" = "rejected";
    let finalVideoUrl: string | null = null;
    let finalFaceScore = 0;
    let finalEngine: "kling" | "runway" | "vidu" = "kling";
    let finalFileName: string | null = null;

    for (let attempt = 0; attempt <= workflow.maxRetries; attempt += 1) {
      const engine = pickEngineForTier(template.content_tier, attempt);
      finalEngine = engine;

      await supabase
        .from("jobs")
        .update({
          status: "generating",
          retry_count: attempt,
          engine_used: engine
        })
        .eq("id", createdJob.id);

      const n8nResult = await callN8nWebhook(workflow.n8nWebhookUrl, {
        event: "job_created",
        job_id: createdJob.id,
        attempt,
        athlete,
        template,
        prompt: assembledPrompt,
        output_filename: outputFilename,
        preferred_engine: engine
      });

      const generated =
        n8nResult?.videoUrl && n8nResult?.engineUsed
          ? { videoUrl: n8nResult.videoUrl, engine: n8nResult.engineUsed }
          : await generateWithEngine(
              engine,
              {
                kling: workflow.klingApiKey,
                runway: workflow.runwayApiKey,
                vidu: workflow.viduApiKey
              },
              {
                prompt: assembledPrompt,
                referencePhotoUrl: athlete.reference_photo_url
              }
            );

      const fileName = outputFilename;
      const persistedUrl = await uploadGeneratedVideo(generated.videoUrl, fileName);

      await supabase.from("jobs").update({ status: "scoring" }).eq("id", createdJob.id);

      const faceScore =
        n8nResult?.faceScore ??
        (await scoreFaceMatch({
          athleteName: athlete.name,
          descriptor: athlete.descriptor,
          templateVariant: template.variant_name,
          prompt: assembledPrompt,
          anthropicApiKey: workflow.anthropicApiKey
        }));

      finalVideoUrl = persistedUrl;
      finalFaceScore = faceScore;
      finalFileName = fileName;
      finalEngine = generated.engine;

      if (faceScore >= workflow.autoApproveThreshold) {
        finalStatus = "approved";
        break;
      }

      if (attempt === workflow.maxRetries) {
        finalStatus = faceScore >= workflow.reviewThreshold ? "needs_review" : "rejected";
      }
    }

    const { error: finalizeError } = await supabase
      .from("jobs")
      .update({
        status: finalStatus,
        face_score: finalFaceScore,
        video_url: finalVideoUrl,
        engine_used: finalEngine,
        file_name: finalFileName,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", createdJob.id);

    if (finalizeError) {
      throw new Error(finalizeError.message);
    }

    if (finalStatus === "approved") {
      const nextTotal = (athlete.videos_generated ?? 0) + 1;
      await supabase.from("athletes").update({ videos_generated: nextTotal }).eq("id", athlete.id);
    }

    const { data: finalJob, error: finalJobError } = await supabase
      .from("jobs")
      .select("*, athlete:athletes(name), template:templates(variant_name, category, location)")
      .eq("id", createdJob.id)
      .single();

    if (finalJobError || !finalJob) {
      throw new Error(finalJobError?.message ?? "Failed to fetch completed job.");
    }

    return NextResponse.json({ data: finalJob as Job });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
