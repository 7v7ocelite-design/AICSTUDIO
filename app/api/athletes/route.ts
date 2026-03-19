import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const formData = await request.formData();
    const supabase = getAdminSupabase();

    const name = String(formData.get("name") ?? "").trim();
    const descriptor = String(formData.get("descriptor") ?? "").trim();
    if (!name || !descriptor) {
      return NextResponse.json({ error: "Name and descriptor are required." }, { status: 400 });
    }

    let referencePhotoUrl: string | null = null;
    const referencePhoto = formData.get("reference_photo");
    if (referencePhoto instanceof File && referencePhoto.size > 0) {
      const extension = (referencePhoto.name.split(".").pop() ?? "jpg").toLowerCase();
      const filePath = `athletes/${crypto.randomUUID()}.${extension}`;
      const buffer = Buffer.from(await referencePhoto.arrayBuffer());
      const upload = await supabase.storage.from("reference-photos").upload(filePath, buffer, {
        upsert: true,
        contentType: referencePhoto.type || "image/jpeg"
      });
      if (!upload.error) {
        const { data } = supabase.storage.from("reference-photos").getPublicUrl(filePath);
        referencePhotoUrl = data.publicUrl;
      }
    }

    const { data: athlete, error } = await supabase
      .from("athletes")
      .insert({
        name,
        position: String(formData.get("position") ?? "").trim() || null,
        class_year: String(formData.get("class_year") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
        descriptor,
        style_preference: String(formData.get("style_preference") ?? "").trim() || null,
        consent_signed: formData.get("consent_signed") === "true",
        reference_photo_url: referencePhotoUrl
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ data: athlete }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
