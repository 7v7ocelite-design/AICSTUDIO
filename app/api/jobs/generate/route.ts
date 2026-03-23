import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import {
  FALLBACK_VIDEO_URL,
  generateWithEngine,
  generateWithRunway,
  pickEngineForTier
} from "@/lib/engines";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Job, Template } from "@/lib/types";
import { parseWorkflowSettings } from "@/lib/workflow";

export const maxDuration = 30;

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
    if (templateError || !template) {
      return NextResponse.json({ error: templateError?.message ?? "Template not found." }, { status: 404 });
    }
    if (settingsError) {
      throw new Error(settingsError.message);
    }

    const settingsMap = (settingsRows ?? []).reduce<Record<string, string>>((accumulator, row) => {
      accumulator[row.key] = row.value;
      return accumulator;
    }, {});
    const workflow = parseWorkflowSettings(settingsMap);
    const assembledPrompt = buildVideoPrompt(athlete as Athlete, template as Template);
    const selectedEngine = pickEngineForTier(template.content_tier, 0);

    const createCompletedOrFailedJob = async (params: {
      status: "completed" | "failed";
      videoUrl?: string | null;
      engineUsed: string;
      errorMessage?: string | null;
    }): Promise<Job> => {
      const { data: createdJob, error: createError } = await supabase
        .from("jobs")
        .insert({
          athlete_id: athlete.id,
          template_id: template.id,
          status: params.status,
          assembled_prompt: assembledPrompt,
          engine_used: params.engineUsed,
          video_url: params.videoUrl ?? null,
          error_message: params.errorMessage ?? null
        })
        .select("*, athlete:athletes(name), template:templates(variant_name, category)")
        .single();

      if (createError || !createdJob) {
        throw new Error(createError?.message ?? "Unable to create job.");
      }

      return createdJob as Job;
    };

    if (selectedEngine === "runway") {
      try {
        const runwayResult = await generateWithRunway(workflow.runwayApiKey, assembledPrompt);
        console.log("[GENERATE] Runway result:", JSON.stringify(runwayResult));

        if ("taskId" in runwayResult) {
          const runwayTaskId = runwayResult.taskId;
          if (!runwayTaskId || runwayTaskId === "00000000-0000-0000-0000-000000000000") {
            console.error("[GENERATE] Invalid runway task ID!", runwayTaskId);
            throw new Error(`Invalid Runway task ID returned: ${runwayTaskId ?? "missing"}`);
          }

          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .insert({
              athlete_id: athlete.id,
              template_id: template.id,
              status: "processing",
              runway_task_id: runwayTaskId,
              assembled_prompt: assembledPrompt,
              engine_used: "runway"
            })
            .select("*, athlete:athletes(name), template:templates(variant_name, category)")
            .single();

          if (jobError || !job) {
            throw new Error(jobError?.message ?? "Unable to create processing job.");
          }

          return NextResponse.json({
            job,
            status: "processing",
            message: "Video is generating. Poll /api/jobs/{id}/status every 10 seconds."
          });
        }

        const persistedUrl = await uploadGeneratedVideo(runwayResult.videoUrl, `${crypto.randomUUID()}.mp4`);
        const completedJob = await createCompletedOrFailedJob({
          status: "completed",
          videoUrl: persistedUrl,
          engineUsed: "runway (mock)"
        });

        return NextResponse.json({
          job: completedJob,
          status: "completed"
        });
      } catch (runwayError) {
        const completedJob = await createCompletedOrFailedJob({
          status: "completed",
          videoUrl: FALLBACK_VIDEO_URL,
          engineUsed: "runway (mock)",
          errorMessage: runwayError instanceof Error ? runwayError.message : "Runway create failed."
        });

        return NextResponse.json({
          job: completedJob,
          status: "completed",
          message: "Runway task creation failed. Returned mock fallback."
        });
      }
    }

    try {
      const generated = await generateWithEngine(
        selectedEngine,
        {
          kling: workflow.klingApiKey,
          vidu: workflow.viduApiKey
        },
        {
          prompt: assembledPrompt,
          referencePhotoUrl: athlete.reference_photo_url
        }
      );
      const persistedUrl = await uploadGeneratedVideo(generated.videoUrl, `${crypto.randomUUID()}.mp4`);
      const completedJob = await createCompletedOrFailedJob({
        status: "completed",
        videoUrl: persistedUrl,
        engineUsed: generated.engine
      });

      return NextResponse.json({
        job: completedJob,
        status: "completed"
      });
    } catch (engineError) {
      const failedJob = await createCompletedOrFailedJob({
        status: "failed",
        engineUsed: selectedEngine,
        errorMessage: engineError instanceof Error ? engineError.message : "Generation failed."
      });

      return NextResponse.json({
        job: failedJob,
        status: "failed"
      });
    }
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
