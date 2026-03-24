import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

interface SignedUrlBody {
  ownerType: "athlete" | "brand";
  ownerId: string;
  filename: string;
  contentType?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<SignedUrlBody>(request);

    const ownerType = body.ownerType;
    const ownerId = body.ownerId?.trim();
    const filename = body.filename?.trim();

    if (!ownerType || !ownerId || !filename) {
      return NextResponse.json(
        { error: "ownerType, ownerId, and filename are required." },
        { status: 400 }
      );
    }
    if (ownerType !== "athlete" && ownerType !== "brand") {
      return NextResponse.json({ error: "Invalid ownerType." }, { status: 400 });
    }

    const ext = (filename.split(".").pop() ?? "bin").toLowerCase();
    const filePath = `${ownerType}/${ownerId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = getAdminSupabase();
    const { data: signed, error: signedError } = await supabase.storage
      .from("assets")
      .createSignedUploadUrl(filePath);

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "Unable to create signed upload URL.");
    }

    const { data: publicData } = supabase.storage.from("assets").getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      filePath,
      publicUrl: publicData.publicUrl
    });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
