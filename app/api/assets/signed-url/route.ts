import { NextRequest, NextResponse } from "next/server";
import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { validateSignedUrlRequest, type SignedUrlResponse } from "@/lib/upload-contracts";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await request.json();
    const result = validateSignedUrlRequest(body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const data = result.data;
    if (!data) {
      return NextResponse.json({ error: "Invalid signed-url payload." }, { status: 400 });
    }

    const { ownerType, ownerId, filename, contentType } = data;
    const ext = (filename.split(".").pop() ?? "bin").toLowerCase();
    const filePath = `${ownerType}/${ownerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = getAdminSupabase();
    const { data: signedData, error } = await supabase.storage
      .from("assets")
      .createSignedUploadUrl(filePath);

    if (error || !signedData) {
      console.error("[SIGNED-URL]", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Failed to create signed URL." },
        { status: 500 }
      );
    }

    const response: SignedUrlResponse = {
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      filePath,
      contentType: contentType || "video/mp4",
    };

    return NextResponse.json(response);
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
