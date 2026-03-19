import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = searchParams.get("sort_order") || "desc";

  let query = supabase
    .from("jobs")
    .select("*, athletes(*), templates(*)")
    .order(sortBy as string, { ascending: sortOrder === "asc" });

  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(`file_name.ilike.%${search}%,assembled_prompt.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = (data || []).map((j: Record<string, unknown>) => ({
    ...j,
    athlete: j.athletes,
    template: j.templates,
    athletes: undefined,
    templates: undefined,
  }));

  return NextResponse.json(jobs);
}
