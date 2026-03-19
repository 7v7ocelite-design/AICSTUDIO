import { fail, ok } from "@/lib/api";
import { createTemplate, listTemplates, listTemplatesGrouped } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const [templates, grouped] = await Promise.all([listTemplates(), listTemplatesGrouped()]);
    return ok({ templates, grouped });
  } catch (error) {
    return fail("Failed to load templates", 500, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const required = [
      "category",
      "variant",
      "action",
      "location",
      "wardrobe",
      "lighting",
      "camera_angle",
      "audio_track",
      "target_platforms",
      "content_tier",
    ];
    for (const field of required) {
      if (!payload[field]) return fail(`Missing field: ${field}`, 400);
    }

    const template = await createTemplate({
      category: String(payload.category),
      variant: String(payload.variant),
      action: String(payload.action),
      location: String(payload.location),
      wardrobe: String(payload.wardrobe),
      lighting: String(payload.lighting),
      camera_angle: String(payload.camera_angle),
      audio_track: String(payload.audio_track),
      target_platforms: Array.isArray(payload.target_platforms)
        ? payload.target_platforms.map(String)
        : String(payload.target_platforms)
            .split(",")
            .map((value) => value.trim()),
      content_tier: String(payload.content_tier) as never,
    });

    return ok({ template }, { status: 201 });
  } catch (error) {
    return fail("Failed to create template", 500, error);
  }
}
