import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const jobId = "44775a4f-6af8-497a-8f25-e00faebcfa13";
    const action = new URL(request.url).searchParams.get("action") || "diagnose";

    // Use a FRESH client each time (bypass singleton cache)
    const supabase = getAdminSupabase();

    if (action === "fix") {
      // Step 1: Get the real Runway video URL from the single-row query
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (!job) {
        return NextResponse.json({ error: "Job not found" });
      }

      // Step 2: DELETE and re-INSERT the row to bypass any stale cache/index issue
      const { error: deleteErr } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (deleteErr) {
        return NextResponse.json({ error: "Delete failed", details: deleteErr.message });
      }

      // Step 3: Re-insert with correct data
      const { data: inserted, error: insertErr } = await supabase
        .from("jobs")
        .insert({
          id: jobId,
          athlete_id: job.athlete_id,
          template_id: job.template_id,
          status: "completed",
          assembled_prompt: job.assembled_prompt,
          face_score: job.face_score,
          video_url: job.video_url,
          engine_used: "runway (live)",
          file_name: job.file_name,
          runway_task_id: job.runway_task_id,
          error_message: null,
          retry_count: job.retry_count,
          created_at: job.created_at,
          reviewed_at: job.reviewed_at
        })
        .select("id, status, video_url, engine_used, error_message")
        .single();

      if (insertErr) {
        return NextResponse.json({ error: "Insert failed", details: insertErr.message });
      }

      // Step 4: Verify with the broad query
      const { data: allJobs } = await supabase
        .from("jobs")
        .select("id, status, video_url, engine_used, error_message")
        .order("created_at", { ascending: false })
        .limit(50);

      return NextResponse.json({
        action: "fix",
        inserted: inserted,
        allJobs: (allJobs ?? []).map((j: Record<string, unknown>) => ({
          id: String(j.id).slice(0, 8),
          status: j.status,
          video_url: j.video_url ? "has_url" : "none",
          engine: j.engine_used
        }))
      });
    }

    // Default: diagnose
    const { data: plain } = await supabase
      .from("jobs").select("id, status, video_url, engine_used, error_message, created_at")
      .eq("id", jobId).single();

    const { data: allJobs } = await supabase
      .from("jobs").select("id, status, video_url, engine_used, error_message, created_at")
      .order("created_at", { ascending: false }).limit(50);

    // Count rows with this ID
    const { count } = await supabase
      .from("jobs").select("id", { count: "exact", head: true })
      .eq("id", jobId);

    return NextResponse.json({
      action: "diagnose",
      rowCount: count,
      plain: plain ? { status: plain.status, video_url: plain.video_url ? "has_url" : "none", engine: plain.engine_used, error: plain.error_message, created_at: plain.created_at } : null,
      allJobs: (allJobs ?? []).map((j: Record<string, unknown>) => ({
        id: String(j.id).slice(0, 8),
        status: j.status,
        video_url: j.video_url ? "has_url" : "none",
        engine: j.engine_used,
        error: j.error_message,
        created_at: j.created_at
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
