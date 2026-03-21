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
import { createJob, updateJob, fetchJob } from "@/lib/jobs-rpc";

interface GenerateBody {
  athleteId: string;
  templateId?: string;
  custom_prompt?: string;
  duration?: number;
  ratio?: string;
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
    if (!payload.athleteId) {
      return NextResponse.json({ error: "athleteId is required." }, { status: 400 });
    }
    if (!payload.templateId && !payload.custom_prompt) {
      return NextResponse.json({ error: "templateId or custom_prompt is required." }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const [{ data: athlete, error: athleteError }, { data: settingsRows, error: settingsError }] =
      await Promise.all([
        supabase.from("athletes").select("*").eq("id", payload.athleteId).single(),
        supabase.from("settings").select("key, value")
      ]);

    if (athleteError || !athlete) {
      return NextResponse.json({ error: athleteError?.message ?? "Athlete not found." }, { status: 404 });
    }
    if (!athlete.consent_signed) {
      return NextResponse.json(
        { error: "Cannot generate content — athlete has not signed a consent and usage release." },
        { status: 403 }
      );
    }
    if (settingsError) {
      throw new Error(settingsError.message);
    }

    let template: Record<string, unknown> | null = null;
    if (payload.templateId) {
      const { data: t, error: tErr } = await supabase
        .from("templates")
        .select("*")
        .eq("id", payload.templateId)
        .single();
      if (tErr || !t) {
        return NextResponse.json({ error: "Template not found." }, { status: 404 });
      }
      template = t;
    }

    const settingsMap = (settingsRows ?? []).reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    const workflow = parseWorkflowSettings(settingsMap);

    const assembledPrompt = payload.custom_prompt
      ? payload.custom_prompt
      : template
        ? buildVideoPrompt(athlete as Athlete, template as unknown as Template)
        : `${athlete.descriptor}. Cinematic quality, photorealistic, 4K.`;

    const category = (template?.category as string) ?? "Custom";
    const location = (template?.location as string) ?? "Studio";

    console.log("[GENERATE] Athlete:", athlete.name, "| Mode:", template ? "template" : "custom");
    console.log("[GENERATE] Prompt:", assembledPrompt.slice(0, 200));
    console.log("[DEBUG] Settings row count:", settingsRows?.length ?? 0);
    console.log("[DEBUG] settingsMap keys:", Object.keys(settingsMap).join(", "));
    console.log("[DEBUG] runway_api_key in map:", settingsMap["runway_api_key"] ? `SET (${settingsMap["runway_api_key"].slice(0, 12)}...)` : "EMPTY");
    console.log("[DEBUG] workflow.runwayApiKey:", workflow.runwayApiKey ? `SET (${workflow.runwayApiKey.slice(0, 12)}...)` : "EMPTY");
    console.log("[DEBUG] serverEnv.runwayApiKey:", process.env.RUNWAY_API_KEY ? "SET in env" : "NOT in env");

    const templateIdForCount = payload.templateId ?? athlete.id;
    const { count: existingCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", payload.athleteId)
      .eq("template_id", templateIdForCount);
    const version = (existingCount ?? 0) + 1;

    const outputFilename = buildOutputFileName(athlete.name, category, location, version);

    // Create job via RPC (bypasses PostgREST schema cache)
    const { id: jobId } = await createJob(supabase, {
      athlete_id: athlete.id,
      template_id: (template?.id as string) ?? athlete.id,
      status: "queued",
      assembled_prompt: assembledPrompt,
      output_filename: outputFilename,
      retry_count: 0
    });

    let finalStatus: "approved" | "rejected" | "needs_review" = "rejected";
    let finalVideoUrl: string | null = null;
    let finalFaceScore = 0;
    let finalEngine = "kling (mock)";
    let finalFileName: string | null = null;

    for (let attempt = 0; attempt <= workflow.maxRetries; attempt += 1) {
      const tier = (template?.content_tier as "standard" | "premium" | "social") ?? "premium";
      const engine = pickEngineForTier(tier, attempt);
      finalEngine = engine;

      await updateJob(supabase, jobId, {
        status: "generating",
        retry_count: attempt,
        engine_used: engine
      });

      const n8nResult = await callN8nWebhook(workflow.n8nWebhookUrl, {
        event: "job_created",
        job_id: jobId,
        attempt,
        athlete,
        template,
        prompt: assembledPrompt,
        output_filename: outputFilename,
        preferred_engine: engine
      });

      const generated =
        n8nResult?.videoUrl && n8nResult?.engineUsed
          ? { videoUrl: n8nResult.videoUrl, engine: n8nResult.engineUsed, live: true }
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

      const engineLabel = generated.live ? `${generated.engine} (live)` : `${generated.engine} (mock)`;
      console.log(`[GENERATE] Result: engine=${engineLabel}, videoUrl=${generated.videoUrl.slice(0, 80)}`);

      const fileName = outputFilename;
      const persistedUrl = await uploadGeneratedVideo(generated.videoUrl, fileName);

      await updateJob(supabase, jobId, { status: "scoring" });

      const faceScore =
        n8nResult?.faceScore ??
        (await scoreFaceMatch({
          athleteName: athlete.name,
          descriptor: athlete.descriptor,
          templateVariant: (template?.variant_name as string) ?? "custom",
          prompt: assembledPrompt,
          anthropicApiKey: workflow.anthropicApiKey
        }));

      finalVideoUrl = persistedUrl;
      finalFaceScore = faceScore;
      finalFileName = fileName;
      finalEngine = generated.live ? `${generated.engine} (live)` : `${generated.engine} (mock)`;


      if (faceScore >= workflow.autoApproveThreshold) {
        finalStatus = "approved";
        break;
      }

      if (attempt === workflow.maxRetries) {
        finalStatus = faceScore >= workflow.reviewThreshold ? "needs_review" : "rejected";
      }
    }

    await updateJob(supabase, jobId, {
      status: finalStatus,
      face_score: finalFaceScore,
      video_url: finalVideoUrl,
      engine_used: finalEngine,
      file_name: finalFileName,
      reviewed_at: new Date().toISOString()
    });

    if (finalStatus === "approved") {
      const nextTotal = (athlete.videos_generated ?? 0) + 1;
      await supabase.from("athletes").update({ videos_generated: nextTotal }).eq("id", athlete.id);
    }

    const finalJob = await fetchJob(supabase, jobId);
    return NextResponse.json({ data: finalJob as Job });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
