import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

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

    const supabase = getAdminSupabase();
    const uploaded: unknown[] = [];

    for (const file of files) {
      let assetType = "document";
      if (file.type.startsWith("image/")) assetType = "photo";
      if (file.type.startsWith("video/")) assetType = "video";
      if (file.name.toLowerCase().includes("logo")) assetType = "logo";

      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const filePath = `${ownerType}/${ownerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, buffer, { upsert: true, contentType: file.type || "application/octet-stream" });

      if (uploadError) { console.error("[UPLOAD]", uploadError.message); continue; }

      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);

      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({ owner_type: ownerType, owner_id: ownerId, asset_type: assetType, url: urlData.publicUrl, filename: file.name, file_size: file.size, mime_type: file.type })
        .select("*")
        .single();

      if (!dbError && asset) uploaded.push(asset);
    }

    return NextResponse.json({ uploaded, count: uploaded.length }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
