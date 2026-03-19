import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("category")
    .order("variant");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped: Record<string, typeof data> = {};
  for (const t of data || []) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return NextResponse.json({ templates: data, grouped });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("templates")
    .insert({
      category: body.category,
      variant: body.variant,
      action: body.action,
      location: body.location,
      wardrobe: body.wardrobe,
      lighting: body.lighting,
      camera_angle: body.camera_angle,
      audio_track: body.audio_track,
      platforms: body.platforms,
      content_tier: body.content_tier,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
