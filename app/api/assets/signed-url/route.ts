import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const { ownerType, ownerId, filename, contentType } = await request.json();

    if (!ownerType || !ownerId || !filename) {
      return NextResponse.json({ error: "Missing ownerType, ownerId, or filename." }, { status: 400 });
    }

    const ext = (filename.split(".").pop() ?? "bin").toLowerCase();
    const filePath = `${ownerType}/${ownerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = getAdminSupabase();
    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error("[SIGNED-URL]", error?.message);
      return NextResponse.json({ error: error?.message ?? "Failed to create signed URL." }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      filePath,
      contentType: contentType || "video/mp4"
    });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
