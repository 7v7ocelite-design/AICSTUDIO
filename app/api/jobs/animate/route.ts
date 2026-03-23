import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { FALLBACK_VIDEO_URL, generateImageToVideoWithRunway } from "@/lib/engines";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Template } from "@/lib/types";
import { parseWorkflowSettings } from "@/lib/workflow";

export const maxDuration = 30;

interface AnimateBody {
  athleteId: string;
  templateId: string;
  imageUrl?: string;
  prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const payload = await readJsonBody<AnimateBody>(request);
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

    const finalPrompt = payload.prompt?.trim() || buildVideoPrompt(athlete as Athlete, template as Template);
    const promptImage = payload.imageUrl?.trim() || athlete.reference_photo_url;

    if (!promptImage) {
      return NextResponse.json(
        { error: "No source image provided and athlete has no reference_photo_url." },
        { status: 400 }
      );
    }

    try {
      const runwayResult = await generateImageToVideoWithRunway(workflow.runwayApiKey, finalPrompt, promptImage);

      if ("taskId" in runwayResult) {
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert({
            athlete_id: athlete.id,
            template_id: template.id,
            status: "processing",
            runway_task_id: runwayResult.taskId,
            assembled_prompt: finalPrompt,
            engine_used: "runway"
          })
          .select("*, athlete:athletes(name), template:templates(variant_name, category)")
          .single();

        if (jobError || !job) {
          throw new Error(jobError?.message ?? "Unable to create animation job.");
        }

        return NextResponse.json({
          job,
          status: "processing",
          message: "Animation is generating. Poll /api/jobs/{id}/status every 10 seconds."
        });
      }

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          athlete_id: athlete.id,
          template_id: template.id,
          status: "completed",
          assembled_prompt: finalPrompt,
          engine_used: "runway (mock)",
          video_url: runwayResult.videoUrl
        })
        .select("*, athlete:athletes(name), template:templates(variant_name, category)")
        .single();

      if (jobError || !job) {
        throw new Error(jobError?.message ?? "Unable to create completed animation job.");
      }

      return NextResponse.json({ job, status: "completed" });
    } catch (runwayError) {
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          athlete_id: athlete.id,
          template_id: template.id,
          status: "completed",
          assembled_prompt: finalPrompt,
          engine_used: "runway (mock)",
          video_url: FALLBACK_VIDEO_URL,
          error_message: runwayError instanceof Error ? runwayError.message : "Runway image-to-video create failed."
        })
        .select("*, athlete:athletes(name), template:templates(variant_name, category)")
        .single();

      if (jobError || !job) {
        throw new Error(jobError?.message ?? "Unable to create fallback animation job.");
      }

      return NextResponse.json({
        job,
        status: "completed",
        message: "Runway image-to-video creation failed. Returned mock fallback."
      });
    }
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
