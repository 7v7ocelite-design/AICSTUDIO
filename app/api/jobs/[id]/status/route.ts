import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { pollRunwayTask } from "@/lib/engines";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const terminalStatuses = new Set([
  "approved",
  "rejected",
  "needs_review",
  "completed",
  "failed"
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

    if (job.status !== "processing" || !job.runway_task_id) {
      return NextResponse.json(job);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["runway_api_key"]);
    if (settingsError) {
      return NextResponse.json(job);
    }

    const runwayKey = settings?.find((setting) => setting.key === "runway_api_key")?.value ?? "";
    if (!runwayKey) {
      return NextResponse.json(job);
    }

    try {
      const runwayData = await pollRunwayTask(runwayKey, job.runway_task_id);
      const runwayStatus = runwayData.status ?? "UNKNOWN";

      if (runwayStatus === "SUCCEEDED" && Array.isArray(runwayData.output) && runwayData.output.length > 0) {
        const videoUrl = runwayData.output[0];
        await supabase
          .from("jobs")
          .update({
            status: "completed",
            video_url: videoUrl,
            engine_used: "runway (live)",
            error_message: null
          })
          .eq("id", params.id);

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
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: errorMessage
          })
          .eq("id", params.id);

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
    } catch {
      return NextResponse.json({
        ...job,
        status: "processing"
      });
    }
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
