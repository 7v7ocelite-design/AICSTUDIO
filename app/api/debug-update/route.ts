import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const jobId = "44775a4f-6af8-497a-8f25-e00faebcfa13";

    // Query 1: Plain select (like status endpoint)
    const { data: plain, error: plainErr } = await supabase
      .from("jobs")
      .select("id, status, video_url, engine_used, error_message")
      .eq("id", jobId)
      .single();

    // Query 2: JOIN select (like bootstrap)
    const { data: joined, error: joinErr } = await supabase
      .from("jobs")
      .select("*, athlete:athletes(name), template:templates(variant_name, category, location)")
      .eq("id", jobId)
      .single();

    // Query 3: All jobs with JOIN (exactly like bootstrap)
    const { data: allJobs, error: allErr } = await supabase
      .from("jobs")
      .select("*, athlete:athletes(name), template:templates(variant_name, category, location)")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      plain: plain ? { status: plain.status, video_url: plain.video_url ? "has_url" : "none", engine: plain.engine_used, error: plain.error_message } : plainErr?.message,
      joined: joined ? { status: joined.status, video_url: joined.video_url ? "has_url" : "none", engine: joined.engine_used, error: joined.error_message } : joinErr?.message,
      allJobsCount: allJobs?.length ?? 0,
      allJobs: (allJobs ?? []).map((j) => ({
        id: String(j.id).slice(0, 8),
        status: j.status,
        video_url: j.video_url ? "has_url" : "none",
        engine: j.engine_used,
        error: j.error_message
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
