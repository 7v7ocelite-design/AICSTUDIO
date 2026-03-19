import { fail, ok } from "@/lib/api";
import { createAthlete, listAthletes } from "@/lib/data-service";
import { uploadReferencePhoto } from "@/lib/upload";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const athletes = await listAthletes();
    return ok({ athletes });
  } catch (error) {
    return fail("Failed to load athletes", 500, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let payload: Record<string, unknown> = {};
    let uploadedPhotoUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("reference_photo");
      if (file instanceof File && file.size > 0) {
        uploadedPhotoUrl = await uploadReferencePhoto(file);
      }
      payload = {
        name: form.get("name"),
        position: form.get("position"),
        class_year: Number(form.get("class_year")),
        state: form.get("state"),
        descriptor: form.get("descriptor"),
        style_preference: form.get("style_preference"),
        consent_signed: form.get("consent_signed") === "true",
      };
    } else {
      payload = (await request.json()) as Record<string, unknown>;
    }

    const required = ["name", "position", "class_year", "state", "descriptor", "style_preference"];
    for (const field of required) {
      if (!payload[field]) {
        return fail(`Missing field: ${field}`, 400);
      }
    }

    const athlete = await createAthlete({
      name: String(payload.name),
      position: String(payload.position) as never,
      class_year: Number(payload.class_year),
      state: String(payload.state),
      descriptor: String(payload.descriptor),
      style_preference: String(payload.style_preference) as never,
      reference_photo_url: uploadedPhotoUrl ?? ((payload.reference_photo_url as string | null) ?? null),
      consent_signed: Boolean(payload.consent_signed),
    });
    return ok({ athlete }, { status: 201 });
  } catch (error) {
    return fail("Failed to create athlete", 500, error);
  }
}
