import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAuthenticatedOperator(request);
  const supabase = getAdminSupabase();
  const athleteId = request.nextUrl.searchParams.get("athlete_id");

  let query = supabase
    .from("voice_clones")
    .select("*")
    .order("created_at", { ascending: false });

  if (athleteId) query = query.eq("athlete_id", athleteId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
