import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { pollRunwayTask } from "@/lib/engines";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STALE_MINUTES = 30;

const terminalStatuses = new Set([
  "approved",
  "rejected",
  "needs_review",
  "completed"
  // NOTE: "failed" is NOT terminal \u2014 we re-check Runway in case it completed after timeout
]);

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedOperator(_request);

    const supabase = getAdminSupabase();
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (terminalStatuses.has(job.status)) {
      return NextResponse.json(job);
    }

    // Recovery check: if job "failed" with timeout but has a real runway_task_id,
    // re-poll Runway \u2014 the video may have completed after we gave up.
    const isTimeoutFailure =
      job.status === "failed" &&
      job.runway_task_id &&
      job.runway_task_id !== "00000000-0000-0000-0000-000000000000" &&
      typeof job.error_message === "string" &&
      job.error_message.includes("timed out");

    if (job.status !== "processing" && !isTimeoutFailure) {
      return NextResponse.json(job);
    }

    if (!job.runway_task_id || job.runway_task_id === "00000000-0000-0000-0000-000000000000") {
      return NextResponse.json(job);
    }

    // Stale job timeout \u2014 auto-fail after STALE_MINUTES (skip for recovery checks)
    if (!isTimeoutFailure) {
      const createdAt = new Date(job.created_at).getTime();
      const elapsed = Date.now() - createdAt;
      if (elapsed > STALE_MINUTES * 60 * 1000) {
        const errorMessage = `Generation timed out after ${STALE_MINUTES} minutes.`;
        const { error: staleErr } = await supabase
          .from("jobs")
          .update({ status: "failed", error_message: errorMessage })
          .eq("id", params.id);
        if (staleErr) console.error(`[STATUS] Stale timeout update error:`, staleErr.message);

        return NextResponse.json({
          ...job,
          status: "failed",
          error_message: errorMessage
        });
      }
    }

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["runway_api_key"]);
    if (settingsError) {
      return NextResponse.json(job);
    }

    const runwayKey =
      settings?.find((setting) => setting.key === "runway_api_key")?.value ||
      serverEnv.runwayApiKey ||
      "";
    if (!runwayKey) {
      return NextResponse.json(job);
    }

    try {
      const runwayData = await pollRunwayTask(runwayKey, job.runway_task_id);
      const runwayStatus = runwayData.status ?? "UNKNOWN";

      if (runwayStatus === "SUCCEEDED" && Array.isArray(runwayData.output) && runwayData.output.length > 0) {
        const videoUrl = runwayData.output[0];
        console.log(`[STATUS] Runway SUCCEEDED for job ${params.id}, updating DB with video URL`);

        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            status: "completed",
            video_url: videoUrl,
            engine_used: "runway (live)",
            error_message: null
          })
          .eq("id", params.id);

        if (updateError) {
          console.error(`[STATUS] DB update FAILED for job ${params.id}:`, updateError.message, updateError.details, updateError.hint);
          // Fallback: try updating only safe columns (in case of PostgREST schema cache issue)
          const { error: fallbackError } = await supabase
            .from("jobs")
            .update({ status: "completed", video_url: videoUrl, engine_used: "runway (live)" })
            .eq("id", params.id);
          if (fallbackError) {
            console.error(`[STATUS] Fallback DB update also FAILED:`, fallbackError.message);
          } else {
            console.log(`[STATUS] Fallback update succeeded (without error_message null)`);
          }
        } else {
          console.log(`[STATUS] DB update succeeded for job ${params.id}`);
        }

        return NextResponse.json({
          ...job,
          status: "completed",
          video_url: videoUrl,
          engine_used: "runway (live)",
          error_message: null
        });
      }

      if (runwayStatus === "FAILED") {
        const errorMessage =
          runwayData.failure || runwayData.failureCode || "Runway generation failed.";
        const { error: failUpdateErr } = await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: errorMessage
          })
          .eq("id", params.id);
        if (failUpdateErr) console.error(`[STATUS] Failed update error for job ${params.id}:`, failUpdateErr.message);

        return NextResponse.json({
          ...job,
          status: "failed",
          error_message: errorMessage
        });
      }

      return NextResponse.json({
        ...job,
        status: "processing",
        runway_status: runwayStatus,
        progress: typeof runwayData.progress === "number" ? runwayData.progress : null
      });
    } catch (pollError) {
      console.error("[STATUS] Runway poll error:", pollError);
      return NextResponse.json({
        ...job,
        status: "processing",
        runway_status: "POLL_ERROR",
        error_message: pollError instanceof Error ? pollError.message : "Runway poll failed"
      });
    }
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
