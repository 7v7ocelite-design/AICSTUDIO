import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Job, Template } from "@/lib/types";
import { buildOutputFileName, parseWorkflowSettings } from "@/lib/workflow";
import { createJob, updateJob, fetchJob } from "@/lib/jobs-rpc";
import { optimizePrompt } from "@/lib/claude";

export const maxDuration = 30;

interface GenerateBody {
  athleteId: string;
  templateId?: string;
  custom_prompt?: string;
  duration?: number;
  ratio?: string;
}

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

    let template: Template | null = null;
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
        ? buildVideoPrompt(athlete as Athlete, template)
        : `${athlete.descriptor}. Cinematic quality, photorealistic, 4K.`;

    const category = (template?.category as string) ?? "Custom";
    const location = (template?.location as string) ?? "Studio";

    console.log("[GENERATE] Athlete:", athlete.name, "| Mode:", template ? "template" : "custom");
    console.log("[GENERATE] Runway key:", workflow.runwayApiKey ? "SET" : "NOT SET");
    console.log("[GENERATE] Claude key:", workflow.anthropicApiKey ? "SET" : "NOT SET");

    // Claude prompt optimization
    let finalPrompt = assembledPrompt;
    if (workflow.anthropicApiKey) {
      try {
        console.log("[CLAUDE] Optimizing prompt...");
        const optimized = await optimizePrompt(workflow.anthropicApiKey, assembledPrompt, {
          athleteName: athlete.name,
          templateCategory: category,
          contentTier: (template?.content_tier as string) ?? "premium",
          platform: (template?.platforms as string) ?? "Instagram"
        });
        finalPrompt = optimized.optimizedPrompt;
        console.log("[CLAUDE] Optimized:", finalPrompt.slice(0, 150));
      } catch (err) {
        console.error("[CLAUDE] Optimization failed, using raw prompt:", err instanceof Error ? err.message : err);
      }
    }
    console.log("[GENERATE] Final prompt:", finalPrompt.slice(0, 200));

    const templateIdForCount = payload.templateId ?? athlete.id;
    const { count: existingCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", payload.athleteId)
      .eq("template_id", templateIdForCount);
    const version = (existingCount ?? 0) + 1;

    const outputFilename = buildOutputFileName(athlete.name, category, location, version);

    // --- Background Polling Mode ---
    // Create Runway task and return immediately. Frontend polls /api/jobs/[id]/status.
    const apiKeys = {
      kling: workflow.klingApiKey,
      runway: workflow.runwayApiKey,
      vidu: workflow.viduApiKey
    };

    if (!apiKeys.runway) {
      // No Runway key — create mock job immediately
      const { id: jobId } = await createJob(supabase, {
        athlete_id: athlete.id,
        template_id: template?.id ?? null,
        status: "approved",
        assembled_prompt: finalPrompt,
        output_filename: outputFilename,
        retry_count: 0
      });

      const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
      await updateJob(supabase, jobId, {
        video_url: FALLBACK_VIDEO_URL,
        engine_used: "runway (mock)",
        face_score: 25,
        reviewed_at: new Date().toISOString()
      });

      const finalJob = await fetchJob(supabase, jobId);
      return NextResponse.json({ data: finalJob as Job, _debugError: errMsg, _debugStack: errStack });
    }

    // Create the Runway task (takes <5 seconds)
    try {
      console.log("[GENERATE] Step 1: Importing engines...");
      const { createRunwayTaskOnly } = await import("@/lib/engines");
      
      console.log("[GENERATE] Step 2: Creating Runway task...");
      console.log("[GENERATE] API key present:", !!apiKeys.runway, "Prompt length:", finalPrompt.length);
      const { taskId } = await createRunwayTaskOnly(apiKeys.runway, {
        prompt: finalPrompt,
        referencePhotoUrl: null
      });
      console.log("[GENERATE] Step 3: Runway task created:", taskId);

      console.log("[GENERATE] Step 4: Creating job in DB...");
      const { id: jobId } = await createJob(supabase, {
        athlete_id: athlete.id,
        template_id: template?.id ?? null,
        status: "processing",
        assembled_prompt: finalPrompt,
        output_filename: outputFilename,
        retry_count: 0
      });
      console.log("[GENERATE] Step 5: Job created:", jobId);

      console.log("[GENERATE] Step 6: Saving runway_task_id...");
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ runway_task_id: taskId, engine_used: "runway" })
        .eq("id", jobId);
      if (updateError) {
        console.error("[GENERATE] Step 6 FAILED:", updateError.message);
      }
      console.log("[GENERATE] Step 7: Fetching final job...");

      const finalJob = await fetchJob(supabase, jobId);
      console.log("[GENERATE] Step 8: SUCCESS — returning with polling=true");
      return NextResponse.json({
        data: finalJob as Job,
        polling: true,
        message: `Video is generating. Poll /api/jobs/${jobId}/status every 10 seconds.`
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : "";
      console.error("[GENERATE] CATCH BLOCK HIT:", errMsg);
      console.error("[GENERATE] Stack:", errStack);

      // Fallback to mock
      const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
      const { id: jobId } = await createJob(supabase, {
        athlete_id: athlete.id,
        template_id: template?.id ?? null,
        status: "approved",
        assembled_prompt: finalPrompt,
        output_filename: outputFilename,
        retry_count: 0
      });

      await updateJob(supabase, jobId, {
        video_url: FALLBACK_VIDEO_URL,
        engine_used: "runway (mock)",
        face_score: 25,
        reviewed_at: new Date().toISOString()
      });

      const finalJob = await fetchJob(supabase, jobId);
      return NextResponse.json({ data: finalJob as Job });
    }
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
