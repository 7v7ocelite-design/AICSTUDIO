import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("athlete_id, template_id")
    .eq("id", id)
    .single();

  if (fetchError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    athlete_id: job.athlete_id,
    template_id: job.template_id,
    regenerate_from: id,
  });
}
