import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from("settings").select("*").order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ?? [] });
}

export async function PUT(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as {
    items?: Array<{ id?: string; key: string; value: string }>;
  };

  const items = payload.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ error: "No settings provided." }, { status: 400 });
  }

  const upserts = items.map((item) => ({
    id: item.id,
    key: item.key,
    value: item.value
  }));

  const { data, error } = await supabase
    .from("settings")
    .upsert(upserts, { onConflict: "key" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ?? [] });
}
