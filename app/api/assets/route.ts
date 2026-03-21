import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const { searchParams } = new URL(request.url);
    const ownerType = searchParams.get("owner_type");
    const ownerId = searchParams.get("owner_id");
    const supabase = getAdminSupabase();
    let query = supabase.from("assets").select("*").order("sort_order").order("created_at", { ascending: false });
    if (ownerType) query = query.eq("owner_type", ownerType);
    if (ownerId) query = query.eq("owner_id", ownerId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
