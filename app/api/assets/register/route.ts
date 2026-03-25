import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { validateRegisterRequest } from "@/lib/upload-contracts";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await request.json();
    const result = validateRegisterRequest(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (!result.data) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { ownerType, ownerId, filePath, filename, fileSize, mimeType, assetType } = result.data;

    const supabase = getAdminSupabase();
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(filePath);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        asset_type: assetType || "video",
        url: urlData.publicUrl,
        filename,
        file_size: fileSize || null,
        mime_type: mimeType || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[REGISTER]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
