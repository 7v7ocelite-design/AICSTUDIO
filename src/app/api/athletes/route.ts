import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get("position");
  const state = searchParams.get("state");
  const classYear = searchParams.get("class_year");
  const consent = searchParams.get("consent");
  const search = searchParams.get("search");

  let query = supabase.from("athletes").select("*").order("created_at", { ascending: false });

  if (position) query = query.eq("position", position);
  if (state) query = query.eq("state", state);
  if (classYear) query = query.eq("class_year", parseInt(classYear));
  if (consent !== null && consent !== undefined && consent !== "") {
    query = query.eq("consent_signed", consent === "true");
  }
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("athletes")
    .insert({
      name: body.name,
      position: body.position,
      class_year: body.class_year,
      state: body.state,
      descriptor: body.descriptor,
      style_preference: body.style_preference || "casual",
      reference_photo_url: body.reference_photo_url || null,
      consent_signed: body.consent_signed || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
