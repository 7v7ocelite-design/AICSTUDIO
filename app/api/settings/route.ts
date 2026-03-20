import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .order("key");

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const body = await request.json();
    const settings = body.settings as Record<string, string>;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const upserts = Object.entries(settings)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => ({
        key,
        value,
        created_at: new Date().toISOString()
      }));

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("settings")
        .upsert(upserts, { onConflict: "key" });

      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ data: { saved: upserts.length } });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
