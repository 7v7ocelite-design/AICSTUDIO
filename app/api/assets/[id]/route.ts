import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();
    const { data: asset } = await supabase.from("assets").select("url").eq("id", params.id).single();
    if (asset?.url) {
      const path = asset.url.split("/assets/").pop();
      if (path) await supabase.storage.from("assets").remove([decodeURIComponent(path)]);
    }
    await supabase.from("assets").delete().eq("id", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
