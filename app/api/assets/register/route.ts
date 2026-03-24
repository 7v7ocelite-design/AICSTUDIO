import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

interface RegisterAssetBody {
  ownerType: "athlete" | "brand";
  ownerId: string;
  filePath: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
  assetType?: "photo" | "video" | "logo" | "document";
}

const inferAssetType = (filename: string, mimeType?: string): "photo" | "video" | "logo" | "document" => {
  const lowerName = filename.toLowerCase();
  const lowerMime = (mimeType ?? "").toLowerCase();

  if (lowerName.includes("logo")) return "logo";
  if (lowerMime.startsWith("image/")) return "photo";
  if (lowerMime.startsWith("video/")) return "video";
  return "document";
};

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<RegisterAssetBody>(request);

    if (!body.ownerType || !body.ownerId || !body.filePath || !body.filename) {
      return NextResponse.json(
        { error: "ownerType, ownerId, filePath, and filename are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();
    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(body.filePath);
    const assetType = body.assetType ?? inferAssetType(body.filename, body.mimeType);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        owner_type: body.ownerType,
        owner_id: body.ownerId,
        asset_type: assetType,
        url: publicUrlData.publicUrl,
        filename: body.filename,
        file_size: body.fileSize ?? null,
        mime_type: body.mimeType ?? null
      })
      .select("*")
      .single();

    if (error || !asset) {
      throw new Error(error?.message ?? "Failed to register uploaded asset.");
    }

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
