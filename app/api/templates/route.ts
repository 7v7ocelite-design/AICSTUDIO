import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("category", { ascending: true })
    .order("variant_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const payload = await request.json();

  const { data, error } = await supabase.from("templates").insert(payload).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as Record<string, unknown> & { id?: string };

  if (!payload.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...changes } = payload;
  const { data, error } = await supabase
    .from("templates")
    .update(changes)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

export async function DELETE(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("templates").delete().eq("id", payload.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
