import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");

  let query = supabase
    .from("jobs")
    .select(
      "id, athlete_id, template_id, prompt, status, face_score, filename, video_url, content_tier, progress, provider, error, created_at, updated_at, athlete:athletes(id,name,sport), template:templates(id,category,variant_name)"
    )
    .order("created_at", { ascending: false })
    .limit(Number.isNaN(limit) ? 20 : limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}
