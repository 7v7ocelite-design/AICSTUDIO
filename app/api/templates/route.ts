import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

interface CreateTemplateBody {
  category: string;
  variant_name: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track?: string | null;
  content_tier: "standard" | "premium" | "social";
  platforms?: string | null;
}

const requiredFields: Array<keyof CreateTemplateBody> = [
  "category",
  "variant_name",
  "action",
  "location",
  "wardrobe",
  "lighting",
  "camera_angle",
  "content_tier"
];

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const payload = await readJsonBody<CreateTemplateBody>(request);

    for (const field of requiredFields) {
      const value = payload[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        return NextResponse.json({ error: `Field '${field}' is required.` }, { status: 400 });
      }
    }

    if (!["standard", "premium", "social"].includes(payload.content_tier)) {
      return NextResponse.json({ error: "Invalid content_tier." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        category: payload.category.trim(),
        variant_name: payload.variant_name.trim(),
        action: payload.action.trim(),
        location: payload.location.trim(),
        wardrobe: payload.wardrobe.trim(),
        lighting: payload.lighting.trim(),
        camera_angle: payload.camera_angle.trim(),
        audio_track: payload.audio_track?.trim() || null,
        content_tier: payload.content_tier,
        platforms: payload.platforms?.trim() || null
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
