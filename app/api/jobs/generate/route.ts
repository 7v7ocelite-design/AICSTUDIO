import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Job, Template } from "@/lib/types";
import { buildOutputFileName, parseWorkflowSettings } from "@/lib/workflow";
import { createJob, updateJob, fetchJob } from "@/lib/jobs-rpc";
import { optimizePrompt } from "@/lib/claude";
import { serverEnv } from "@/lib/env";

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
        console.log("[CLAUDE] Optimized prompt OK");
      } catch (err) {
        console.error("[CLAUDE] Optimization failed, using raw prompt:", err instanceof Error ? err.message : err);
      }
    }

    const templateIdForCount = payload.templateId ?? athlete.id;
    const { count: existingCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", payload.athleteId)
      .eq("template_id", templateIdForCount);
    const version = (existingCount ?? 0) + 1;

    const outputFilename = buildOutputFileName(athlete.name, category, location, version);

    // --- Resolve Runway API key with multiple fallbacks ---
    let runwayKey = workflow.runwayApiKey || "";
    const keySource: string[] = [];

    if (runwayKey) {
      keySource.push("workflow");
    } else {
      // Try direct DB lookup
      runwayKey = settingsMap["runway_api_key"] || "";
      if (runwayKey) {
        keySource.push("direct-db");
      }
    }
    if (!runwayKey) {
      // Try env var
      runwayKey = serverEnv.runwayApiKey || "";
      if (runwayKey) {
        keySource.push("env");
      }
    }

    console.log(`[GENERATE] Runway key: ${runwayKey ? "SET" : "NOT SET"} (source: ${keySource.join(",") || "none"})`);
    console.log(`[GENERATE] Settings keys in DB: ${JSON.stringify(Object.keys(settingsMap))}`);

    if (!runwayKey) {
      // No Runway key anywhere — create mock job
      console.log("[GENERATE] No Runway key found — returning mock");
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
        engine_used: "runway (mock - no key)",
        face_score: 25,
        reviewed_at: new Date().toISOString()
      });

      const finalJob = await fetchJob(supabase, jobId);
      return NextResponse.json({
        data: finalJob as Job,
        _noKey: true,
        _settingsKeys: Object.keys(settingsMap),
        _keySource: keySource
      });
    }

    // --- Create real Runway task ---
    console.log("[GENERATE] Calling createRunwayTaskOnly...");
    const { createRunwayTaskOnly } = await import("@/lib/engines");
    const { taskId } = await createRunwayTaskOnly(runwayKey, {
      prompt: finalPrompt,
      referencePhotoUrl: null
    });
    console.log(`[GENERATE] Runway task created: ${taskId}`);

    // Save job with processing status + runway task ID
    const { id: jobId } = await createJob(supabase, {
      athlete_id: athlete.id,
      template_id: template?.id ?? null,
      status: "processing",
      assembled_prompt: finalPrompt,
      output_filename: outputFilename,
      retry_count: 0
    });

    await supabase
      .from("jobs")
      .update({ runway_task_id: taskId, engine_used: "runway" })
      .eq("id", jobId);

    console.log(`[GENERATE] Job ${jobId} created with runway_task_id=${taskId}`);

    const finalJob = await fetchJob(supabase, jobId);
    return NextResponse.json({
      data: finalJob as Job,
      polling: true,
      message: `Video is generating. Poll /api/jobs/${jobId}/status every 10 seconds.`
    });

  } catch (err) {
    // --- CATCH: Runway call or DB operation failed ---
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack?.slice(0, 500) : "";
    console.error("[GENERATE] CATCH:", errMsg);

    try {
      const supabase = getAdminSupabase();
      const payload = await request.clone().json() as GenerateBody;

      const { id: jobId } = await createJob(supabase, {
        athlete_id: payload.athleteId,
        template_id: payload.templateId ?? null,
        status: "approved",
        assembled_prompt: errMsg,
        output_filename: "error-fallback.mp4",
        retry_count: 0
      });

      const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
      await updateJob(supabase, jobId, {
        video_url: FALLBACK_VIDEO_URL,
        engine_used: "runway (mock - error)",
        face_score: 25,
        error_message: errMsg,
        reviewed_at: new Date().toISOString()
      });

      const finalJob = await fetchJob(supabase, jobId);
      return NextResponse.json({
        data: finalJob as Job,
        _debugError: errMsg,
        _debugStack: errStack
      });
    } catch (innerErr) {
      return NextResponse.json({
        error: "Complete failure",
        _debugError: errMsg,
        _debugStack: errStack,
        _innerError: innerErr instanceof Error ? innerErr.message : String(innerErr)
      }, { status: 500 });
    }
  }
}
