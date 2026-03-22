import { NextRequest, NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { RUNWAY_API_VERSION, RUNWAY_BASE_URL } from "@/lib/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getAdminSupabase();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If already completed or failed, return as-is
  if (job.status !== "processing") {
    return NextResponse.json(job);
  }

  // If still processing and has a Runway task, poll Runway
  if (job.runway_task_id) {
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["runway_api_key"]);

    const runwayKey = settings?.find((s: { key: string; value: string }) => s.key === "runway_api_key")?.value;

    if (runwayKey) {
      try {
        const pollRes = await fetch(
          `${RUNWAY_BASE_URL}/tasks/${job.runway_task_id}`,
          {
            headers: {
              Authorization: `Bearer ${runwayKey}`,
              "X-Runway-Version": RUNWAY_API_VERSION
            }
          }
        );

        const pollData = await pollRes.json();
        console.log(
          `[STATUS] Job ${params.id}: Runway task ${job.runway_task_id} → ${pollData.status}`
        );

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
            engine_used: "runway (live)"
          });
        }

        if (pollData.status === "FAILED") {
          const errMsg = pollData.failure || pollData.failureCode || "Runway generation failed";
          await supabase
            .from("jobs")
            .update({ status: "failed", error_message: errMsg })
            .eq("id", params.id);

          return NextResponse.json({ ...job, status: "failed", error_message: errMsg });
        }

        // Still running — return current status
        return NextResponse.json({
          ...job,
          status: "processing",
          runway_status: pollData.status,
          progress: pollData.progress ?? null
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error("[STATUS] Runway poll error:", message);
        return NextResponse.json({ ...job, status: "processing" });
      }
    }
  }

  return NextResponse.json(job);
}
