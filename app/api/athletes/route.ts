import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

const MAX_PHOTOS = 5;
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

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

    // Handle multiple reference photos (up to MAX_PHOTOS)
    // Also support legacy single "reference_photo" field
    const photoFiles: File[] = [];
    const multiPhotos = formData.getAll("reference_photos") as File[];
    for (const f of multiPhotos) {
      if (f instanceof File && f.size > 0) photoFiles.push(f);
    }
    const singlePhoto = formData.get("reference_photo");
    if (singlePhoto instanceof File && singlePhoto.size > 0 && photoFiles.length === 0) {
      photoFiles.push(singlePhoto);
    }
    const photos = photoFiles.slice(0, MAX_PHOTOS);

    // Handle optional reference video
    const videoFile = formData.get("reference_video");
    const hasVideo = videoFile instanceof File && videoFile.size > 0 && videoFile.size <= MAX_VIDEO_SIZE;
    const referenceVideoUrlRaw = String(formData.get("reference_video_url") ?? "").trim();
    const referenceVideoUrl = referenceVideoUrlRaw || null;

    // Upload first photo as primary reference photo
    let referencePhotoUrl: string | null = null;
    if (photos.length > 0) {
      const firstPhoto = photos[0];
      const extension = (firstPhoto.name.split(".").pop() ?? "jpg").toLowerCase();
      const filePath = `athletes/${crypto.randomUUID()}.${extension}`;
      const buffer = Buffer.from(await firstPhoto.arrayBuffer());
      const upload = await supabase.storage.from("reference-photos").upload(filePath, buffer, {
        upsert: true,
        contentType: firstPhoto.type || "image/jpeg"
      });
      if (!upload.error) {
        const { data } = supabase.storage.from("reference-photos").getPublicUrl(filePath);
        referencePhotoUrl = data.publicUrl;
      }
    }

    // Create athlete record
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

    // Upload additional photos + video as assets
    const athleteId = athlete.id;
    const assetUploads: Promise<void>[] = [];

    // Upload ALL photos (including first) as assets for the grid view
    for (const photo of photos) {
      assetUploads.push((async () => {
        const ext = (photo.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `athlete/${athleteId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const buf = Buffer.from(await photo.arrayBuffer());
        const { error: upErr } = await supabase.storage.from("assets").upload(path, buf, {
          upsert: true,
          contentType: photo.type || "image/jpeg"
        });
        if (upErr) return;
        const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
        await supabase.from("assets").insert({
          owner_type: "athlete",
          owner_id: athleteId,
          asset_type: "photo",
          url: urlData.publicUrl,
          filename: photo.name,
          file_size: photo.size,
          mime_type: photo.type
        });
      })());
    }

    // Register direct-uploaded video URL as asset
    if (referenceVideoUrl) {
      assetUploads.push((async () => {
        await supabase.from("assets").insert({
          owner_type: "athlete",
          owner_id: athleteId,
          asset_type: "video",
          url: referenceVideoUrl,
          filename: "reference_video",
          file_size: null,
          mime_type: "video/mp4"
        });
      })());
    }

    // Upload video as asset (legacy multipart flow)
    if (!referenceVideoUrl && hasVideo && videoFile instanceof File) {
      assetUploads.push((async () => {
        const ext = (videoFile.name.split(".").pop() ?? "mp4").toLowerCase();
        const path = `athlete/${athleteId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const buf = Buffer.from(await videoFile.arrayBuffer());
        const { error: upErr } = await supabase.storage.from("assets").upload(path, buf, {
          upsert: true,
          contentType: videoFile.type || "video/mp4"
        });
        if (upErr) return;
        const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
        await supabase.from("assets").insert({
          owner_type: "athlete",
          owner_id: athleteId,
          asset_type: "video",
          url: urlData.publicUrl,
          filename: videoFile.name,
          file_size: videoFile.size,
          mime_type: videoFile.type
        });
      })());
    }

    // Wait for asset uploads (best-effort)
    await Promise.allSettled(assetUploads);

    return NextResponse.json({ data: athlete }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
