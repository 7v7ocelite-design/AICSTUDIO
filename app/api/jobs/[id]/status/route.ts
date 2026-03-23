import { NextRequest, NextResponse } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { RUNWAY_API_VERSION } from "@/lib/engines";
import { serverEnv } from "@/lib/env";
import { parseWorkflowSettings } from "@/lib/workflow";

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
  if (job.runway_task_id && typeof job.runway_task_id === "string") {
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["runway_api_key"]);

    const settingsMap = (settingsRows ?? []).reduce<Record<string, string>>((accumulator, row) => {
      accumulator[row.key] = row.value;
      return accumulator;
    }, {});

    // Use the same key resolution pattern as generate route.
    const workflow = parseWorkflowSettings(settingsMap);
    let runwayKey = workflow.runwayApiKey || "";
    if (!runwayKey) {
      runwayKey = settingsMap.runway_api_key || "";
    }
    if (!runwayKey) {
      runwayKey = serverEnv.runwayApiKey || "";
    }

    if (runwayKey) {
      try {
        const pollRes = await fetch(
          `https://api.dev.runwayml.com/v1/tasks/${job.runway_task_id}`,
          {
            headers: {
              Authorization: `Bearer ${runwayKey}`,
              "X-Runway-Version": RUNWAY_API_VERSION
            }
          }
        );

        const pollData = await pollRes.json();
        const runwayStatus = typeof pollData.status === "string" ? pollData.status : "UNKNOWN";
        console.log(`[STATUS] Polling Runway task ${job.runway_task_id}: ${runwayStatus}`);

        if (runwayStatus === "SUCCEEDED" && pollData.output?.length) {
          const videoUrl = pollData.output[0];
          await supabase
            .from("jobs")
            .update({
              status: "approved",
              video_url: videoUrl,
              engine_used: "runway"
            })
            .eq("id", params.id);

          return NextResponse.json({
            ...job,
            status: "approved",
            video_url: videoUrl,
            engine_used: "runway"
          });
        }

        if (runwayStatus === "FAILED") {
          const errMsg = pollData.failure || pollData.failureCode || "Runway generation failed";
          await supabase
            .from("jobs")
            .update({ status: "failed", error_message: errMsg })
            .eq("id", params.id);

          return NextResponse.json({ ...job, status: "failed", error_message: errMsg });
        }

        // Still running — return current status as-is.
        if (runwayStatus === "RUNNING" || runwayStatus === "THROTTLED") {
          return NextResponse.json(job);
        }

        return NextResponse.json(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error("[STATUS] Runway poll error:", message);
        return NextResponse.json(job);
      }
    } else {
      console.error("[STATUS] No Runway API key found in settings or env vars");
    }
  }

  return NextResponse.json(job);
}
