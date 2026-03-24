import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

const MAX_FILES_PER_UPLOAD = 6; // 5 photos + 1 video
const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const formData = await request.formData();
    const ownerType = String(formData.get("owner_type") ?? "");
    const ownerId = String(formData.get("owner_id") ?? "");
    const files = formData.getAll("files") as File[];

    if (!ownerType || !ownerId || files.length === 0) {
      return NextResponse.json({ error: "Missing owner_type, owner_id, or files." }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({ error: `Max ${MAX_FILES_PER_UPLOAD} files per upload.` }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const uploaded: unknown[] = [];
    const errors: string[] = [];

    for (const file of files) {
      let assetType = "document";
      if (file.type.startsWith("image/")) assetType = "photo";
      if (file.type.startsWith("video/")) assetType = "video";
      if (file.name.toLowerCase().includes("logo")) assetType = "logo";

      // Validate file size based on type
      if (assetType === "photo" && file.size > MAX_PHOTO_SIZE) {
        errors.push(`${file.name}: exceeds 20MB photo limit`);
        continue;
      }
      if (assetType === "video" && file.size > MAX_VIDEO_SIZE) {
        errors.push(`${file.name}: exceeds 5GB video limit`);
        continue;
      }

      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const filePath = `${ownerType}/${ownerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, buffer, { upsert: true, contentType: file.type || "application/octet-stream" });

      if (uploadError) { console.error("[UPLOAD]", uploadError.message); errors.push(`${file.name}: storage error`); continue; }

      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);

      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({ owner_type: ownerType, owner_id: ownerId, asset_type: assetType, url: urlData.publicUrl, filename: file.name, file_size: file.size, mime_type: file.type })
        .select("*")
        .single();

      if (!dbError && asset) uploaded.push(asset);
    }

    return NextResponse.json({
      uploaded,
      count: uploaded.length,
      ...(errors.length > 0 ? { warnings: errors } : {})
    }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
