import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ athletes: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as { name: string; sport: string; bio?: string };

  if (!payload.name || !payload.sport) {
    return NextResponse.json({ error: "name and sport are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("athletes")
    .insert({
      name: payload.name,
      sport: payload.sport,
      bio: payload.bio ?? null
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ athlete: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as {
    id: string;
    name?: string;
    sport?: string;
    bio?: string;
    reference_photo_url?: string;
  };

  if (!payload.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("athletes")
    .update({
      name: payload.name,
      sport: payload.sport,
      bio: payload.bio,
      reference_photo_url: payload.reference_photo_url
    })
    .eq("id", payload.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ athlete: data });
}

export async function DELETE(request: Request) {
  const supabase = getServerSupabase();
  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("athletes").delete().eq("id", payload.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
