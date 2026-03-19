import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .order("key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { settings: entries } = body;

  if (!entries || !Array.isArray(entries)) {
    return NextResponse.json(
      { error: "Settings array is required" },
      { status: 400 }
    );
  }

  for (const entry of entries) {
    const { key, value, description } = entry;

    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      await supabase
        .from("settings")
        .update({
          value,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);
    } else {
      await supabase.from("settings").insert({
        key,
        value,
        description,
      });
    }
  }

  return NextResponse.json({ success: true });
}
