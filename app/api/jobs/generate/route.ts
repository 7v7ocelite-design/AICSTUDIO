import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { createRunwayTaskOnly } from "@/lib/engines";
import { buildVideoPrompt } from "@/lib/prompt";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Athlete, Template } from "@/lib/types";
import { buildOutputFileName, parseWorkflowSettings } from "@/lib/workflow";

export const maxDuration = 55; // Stay under Vercel Hobby 60s limit

interface GenerateBody {
  athleteId: string;
  templateId?: string;
  custom_prompt?: string;
  dryRun?: boolean;
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
        { error: "Cannot generate content \u2014 athlete has not signed a consent and usage release." },
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

    // Resolve Runway API key with fallback chain.
    let runwayKey = workflow.runwayApiKey || "";
    if (!runwayKey) runwayKey = settingsMap.runway_api_key || "";
    if (!runwayKey) {
      return NextResponse.json(
        { error: "No Runway API key configured. Add it in Settings.", code: "NO_KEY" },
        { status: 400 }
      );
    }

    const assembledPrompt = payload.custom_prompt
      ? payload.custom_prompt
      : template
        ? buildVideoPrompt(athlete as Athlete, template as unknown as Template)
        : `${athlete.descriptor}. Cinematic quality, photorealistic, 4K.`;

    const category = (template?.category as string) ?? "Custom";
    const location = (template?.location as string) ?? "Studio";

    console.log("[GENERATE] Athlete:", athlete.name, "| Mode:", template ? "template" : "custom");

    const templateIdForCount = payload.templateId ?? "";
    const countQuery = supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", payload.athleteId);
    if (templateIdForCount) {
      countQuery.eq("template_id", templateIdForCount);
    } else {
      countQuery.is("template_id", null);
    }
    const { count: existingCount } = await countQuery;
    const version = (existingCount ?? 0) + 1;
    const outputFilename = buildOutputFileName(athlete.name, category, location, version);

    // Dry run mode \u2014 validate everything without calling Runway.
    if (payload.dryRun) {
      return NextResponse.json({
        dryRun: true,
        athleteName: athlete.name,
        templateName: (template?.variant_name as string) ?? "custom",
        prompt: assembledPrompt,
        hasRunwayKey: true,
        hasClaudeKey: !!workflow.anthropicApiKey
      });
    }

    // Prefer the canonical athlete field, but fall back to latest uploaded athlete photo asset.
    let referencePhotoUrl: string | null = athlete.reference_photo_url;
    if (!referencePhotoUrl) {
      const { data: latestPhoto } = await supabase
        .from("assets")
        .select("url")
        .eq("owner_type", "athlete")
        .eq("owner_id", athlete.id)
        .eq("asset_type", "photo")
        .order("created_at", { ascending: false })
        .limit(1);

      const assetUrl = latestPhoto?.[0]?.url;
      if (typeof assetUrl === "string" && assetUrl.length > 0) {
        referencePhotoUrl = assetUrl;
        console.log(`[GENERATE] Using fallback athlete photo from assets table for athlete ${athlete.id}`);

        // Best-effort backfill so future requests use the canonical athlete field.
        await supabase
          .from("athletes")
          .update({ reference_photo_url: assetUrl })
          .eq("id", athlete.id);
      }
    }

    // Create the Runway task (returns immediately, no polling).
    const runway = await createRunwayTaskOnly(runwayKey, {
      prompt: assembledPrompt,
      referencePhotoUrl
    });

    if (!runway.taskId || runway.taskId === "00000000-0000-0000-0000-000000000000") {
      console.error("[GENERATE] Invalid runway task ID!", runway.taskId);
      throw new Error(`Invalid Runway task ID returned: ${runway.taskId ?? "missing"}`);
    }

    console.log(`[GENERATE] Runway task created: ${runway.taskId}`);

    // Create job in DB with the REAL Runway task ID.
    const { data: job, error: createError } = await supabase
      .from("jobs")
      .insert({
        athlete_id: athlete.id,
        template_id: (template?.id as string) ?? null,
        status: "processing",
        assembled_prompt: assembledPrompt,
        file_name: outputFilename,
        retry_count: 0,
        engine_used: "runway",
        runway_task_id: runway.taskId
      })
      .select("*")
      .single();

    if (createError || !job) {
      throw new Error(createError?.message ?? "Unable to create processing job.");
    }

    console.log(`[GENERATE] Job ${job.id} created with runway_task_id=${runway.taskId}`);

    // Return immediately \u2014 frontend polls /api/jobs/[id]/status.
    // Attach athlete + template info so the frontend can display names
    // without waiting for a bootstrap refresh.
    const enrichedJob = {
      ...job,
      athlete: { name: athlete.name },
      template: template
        ? { variant_name: template.variant_name as string, category: template.category as string }
        : null
    };

    return NextResponse.json({
      data: enrichedJob,
      polling: true
    });
  } catch (error) {
    const { status, message } = mapApiError(error);
    const lower = message.toLowerCase();

    // Surface credit errors clearly.
    if (lower.includes("not enough credits") || lower.includes("insufficient credits")) {
      return NextResponse.json(
        { error: "Out of Runway credits. Add credits at dev.runwayml.com before generating.", code: "NO_CREDITS" },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: message, _debugError: String(error) },
      { status }
    );
  }
}
