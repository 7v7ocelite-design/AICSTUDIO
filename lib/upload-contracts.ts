/* ═══════════════════════════════════════════════════════════
 * upload-contracts.ts
 * Single source of truth for media limits, upload API shapes,
 * validation, and the client-side direct-upload helper.
 * ═══════════════════════════════════════════════════════════ */

/* ────────── Media Limits ────────── */

export const MEDIA_LIMITS = {
  MAX_PHOTOS_PER_UPLOAD: 5,
  MAX_VIDEO_DURATION: 15, // seconds
  MAX_PHOTO_SIZE: 20 * 1024 * 1024, // 20 MB
  MAX_VIDEO_SIZE: 5_000 * 1024 * 1024, // 5 GB (Supabase Pro)
  MAX_FILES_PER_UPLOAD: 6, // 5 photos + 1 video
} as const;

/* ────────── /api/assets/signed-url ────────── */

export interface SignedUrlRequest {
  ownerType: "athlete" | "brand";
  ownerId: string;
  filename: string;
  contentType?: string;
}

export interface SignedUrlResponse {
  signedUrl: string;
  token: string;
  filePath: string;
  contentType: string;
}

export function validateSignedUrlRequest(
  body: unknown
): { data: SignedUrlRequest; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body." };
  const b = body as Record<string, unknown>;

  if (!b.ownerType || (b.ownerType !== "athlete" && b.ownerType !== "brand")) {
    return { error: "ownerType must be 'athlete' or 'brand'." };
  }
  if (typeof b.ownerId !== "string" || b.ownerId.length === 0) {
    return { error: "ownerId is required." };
  }
  if (typeof b.filename !== "string" || b.filename.length === 0) {
    return { error: "filename is required." };
  }

  return {
    data: {
      ownerType: b.ownerType as "athlete" | "brand",
      ownerId: b.ownerId,
      filename: b.filename,
      contentType: typeof b.contentType === "string" ? b.contentType : undefined,
    },
  };
}

/* ────────── /api/assets/register ────────── */

export interface RegisterAssetRequest {
  ownerType: "athlete" | "brand";
  ownerId: string;
  filePath: string;
  filename: string;
  fileSize?: number | null;
  mimeType?: string | null;
  assetType?: string;
}

export interface RegisterAssetResponse {
  asset: {
    id: string;
    owner_type: string;
    owner_id: string;
    asset_type: string;
    url: string;
    filename: string;
    file_size: number | null;
    mime_type: string | null;
  };
}

export function validateRegisterRequest(
  body: unknown
): { data: RegisterAssetRequest; error?: never } | { data?: never; error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body." };
  const b = body as Record<string, unknown>;

  if (!b.ownerType || (b.ownerType !== "athlete" && b.ownerType !== "brand")) {
    return { error: "ownerType must be 'athlete' or 'brand'." };
  }
  if (typeof b.ownerId !== "string" || b.ownerId.length === 0) return { error: "ownerId is required." };
  if (typeof b.filePath !== "string" || b.filePath.length === 0) return { error: "filePath is required." };
  if (typeof b.filename !== "string" || b.filename.length === 0) return { error: "filename is required." };

  return {
    data: {
      ownerType: b.ownerType as "athlete" | "brand",
      ownerId: b.ownerId,
      filePath: b.filePath,
      filename: b.filename,
      fileSize: typeof b.fileSize === "number" ? b.fileSize : null,
      mimeType: typeof b.mimeType === "string" ? b.mimeType : null,
      assetType: typeof b.assetType === "string" ? b.assetType : "video",
    },
  };
}

/* ────────── Client: direct-upload video to Supabase ────────── */

export async function directUploadVideo(
  file: File,
  ownerType: "athlete" | "brand",
  ownerId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  // Step 1 — signed upload URL
  const signedRes = await fetch("/api/assets/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      ownerType,
      ownerId,
      filename: file.name,
      contentType: file.type || "video/mp4",
    } satisfies SignedUrlRequest),
  });

  if (!signedRes.ok) {
    const err = await signedRes.json().catch(() => ({}));
    return { success: false, error: (err as { error?: string }).error || "Failed to get upload URL" };
  }

  const { signedUrl, filePath } = (await signedRes.json()) as SignedUrlResponse;

  // Step 2 — PUT directly to Supabase Storage
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });

  if (!uploadRes.ok) {
    return { success: false, error: `Storage upload failed: ${uploadRes.status}` };
  }

  // Step 3 — register metadata in DB
  const registerRes = await fetch("/api/assets/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      ownerType,
      ownerId,
      filePath,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      assetType: "video",
    } satisfies RegisterAssetRequest),
  });

  if (!registerRes.ok) {
    return { success: false, error: "File uploaded but metadata registration failed" };
  }

  return { success: true };
}

/* ────────── Client: check video duration ────────── */

export function checkVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
  });
}
