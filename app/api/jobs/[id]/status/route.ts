import { NextRequest, NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { RUNWAY_API_VERSION, RUNWAY_BASE_URL } from "@/lib/engines";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getAdminSupabase();

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!job) {
    return NextResponse.json({
      error: "Job not found",
      _debug: { jobId: params.id, dbError: jobError?.message }
    }, { status: 404 });
  }

  // If already completed or failed, return as-is
  if (job.status !== "processing") {
    return NextResponse.json({
      ...job,
      _debug: { reason: "not_processing", status: job.status }
    });
  }

  // If still processing and has a Runway task, poll Runway
  if (!job.runway_task_id) {
    return NextResponse.json({
      ...job,
      _debug: { reason: "no_runway_task_id", runway_task_id: job.runway_task_id }
    });
  }

  // Get Runway API key with fallbacks
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["runway_api_key"]);

  const runwayKey =
    settings?.find((s: { key: string; value: string }) => s.key === "runway_api_key")?.value
    || serverEnv.runwayApiKey;

  if (!runwayKey) {
    return NextResponse.json({
      ...job,
      _debug: { reason: "no_runway_key" }
    });
  }

  try {
    const pollUrl = `${RUNWAY_BASE_URL}/tasks/${job.runway_task_id}`;
    console.log(`[STATUS] Polling: ${pollUrl}`);

    const pollRes = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${runwayKey}`,
        "X-Runway-Version": RUNWAY_API_VERSION
      }
    });

    const pollText = await pollRes.text();
    let pollData: any;
    try {
      pollData = JSON.parse(pollText);
    } catch {
      return NextResponse.json({
        ...job,
        _debug: {
          reason: "runway_invalid_json",
          httpStatus: pollRes.status,
          rawResponse: pollText.slice(0, 500)
        }
      });
    }

    console.log(`[STATUS] Job ${params.id}: Runway ${job.runway_task_id} → ${pollData.status}`);

    if (pollData.status === "SUCCEEDED" && pollData.output?.length) {
      const videoUrl = pollData.output[0];
      await supabase
        .from("jobs")
        .update({
          status: "completed",
          video_url: videoUrl,
          engine_used: "runway (live)"
        })
        .eq("id", params.id);

      return NextResponse.json({
        ...job,
        status: "completed",
        video_url: videoUrl,
        engine_used: "runway (live)",
        _debug: { reason: "succeeded", runwayStatus: pollData.status }
      });
    }

    if (pollData.status === "FAILED") {
      const errMsg = pollData.failure || pollData.failureCode || "Runway generation failed";
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", params.id);

      return NextResponse.json({
        ...job,
        status: "failed",
        error_message: errMsg,
        _debug: { reason: "failed", runwayData: pollData }
      });
    }

    // Still running
    return NextResponse.json({
      ...job,
      status: "processing",
      runway_status: pollData.status,
      progress: pollData.progress ?? null,
      _debug: {
        reason: "still_running",
        runwayHttpStatus: pollRes.status,
        runwayStatus: pollData.status,
        runwayProgress: pollData.progress,
        runwayKeys: Object.keys(pollData),
        taskId: job.runway_task_id
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[STATUS] Runway poll error:", message);
    return NextResponse.json({
      ...job,
      status: "processing",
      _debug: {
        reason: "poll_exception",
        error: message,
        taskId: job.runway_task_id
      }
    });
  }
}
