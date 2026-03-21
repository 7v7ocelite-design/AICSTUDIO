import { NextRequest, NextResponse } from "next/server";
import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<Record<string, unknown>>(request);
    const supabase = getAdminSupabase();
    const { data, error } = await supabase.from("brands").update(body).eq("id", params.id).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();
    await supabase.from("assets").delete().eq("owner_type", "brand").eq("owner_id", params.id);
    const { error } = await supabase.from("brands").delete().eq("id", params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
