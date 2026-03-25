export const MEDIA_LIMITS = {
  maxPhotosPerUpload: 5,
  maxFilesPerUpload: 6, // 5 photos + 1 video
  maxVideoDurationSeconds: 15,
  maxPhotoSizeBytes: 20 * 1024 * 1024, // 20MB
  maxVideoSizeBytes: 5000 * 1024 * 1024 // 5GB
} as const;

export type OwnerType = "athlete" | "brand";
export type AssetType = "photo" | "video" | "logo" | "document";

export interface SignedUrlRequest {
  ownerType: OwnerType;
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

export interface RegisterAssetRequest {
  ownerType: OwnerType;
  ownerId: string;
  filePath: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
  assetType?: AssetType;
}

export interface DirectUploadResult {
  filePath: string;
}

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isOwnerType = (value: unknown): value is OwnerType =>
  value === "athlete" || value === "brand";

export const isAssetType = (value: unknown): value is AssetType =>
  value === "photo" || value === "video" || value === "logo" || value === "document";

export const validateSignedUrlRequest = (payload: unknown): payload is SignedUrlRequest => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<SignedUrlRequest>;
  return isOwnerType(p.ownerType) && isNonEmptyString(p.ownerId) && isNonEmptyString(p.filename);
};

export const validateRegisterAssetRequest = (payload: unknown): payload is RegisterAssetRequest => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<RegisterAssetRequest>;
  const assetTypeOk = p.assetType === undefined || isAssetType(p.assetType);
  return (
    isOwnerType(p.ownerType) &&
    isNonEmptyString(p.ownerId) &&
    isNonEmptyString(p.filePath) &&
    isNonEmptyString(p.filename) &&
    assetTypeOk
  );
};

export const inferAssetType = (file: File): AssetType => {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.name.toLowerCase().includes("logo")) return "logo";
  return "document";
};

export const validateMediaSelection = async (rawFiles: File[]) => {
  const photos = rawFiles.filter((f) => f.type.startsWith("image/"));
  const videos = rawFiles.filter((f) => f.type.startsWith("video/"));
  const errors: string[] = [];

  if (photos.length > MEDIA_LIMITS.maxPhotosPerUpload) {
    errors.push(
      `Max ${MEDIA_LIMITS.maxPhotosPerUpload} photos per upload — only first ${MEDIA_LIMITS.maxPhotosPerUpload} kept.`
    );
  }
  const validPhotos = photos.slice(0, MEDIA_LIMITS.maxPhotosPerUpload);

  const oversizedPhotos = validPhotos.filter((f) => f.size > MEDIA_LIMITS.maxPhotoSizeBytes);
  if (oversizedPhotos.length > 0) {
    errors.push(`${oversizedPhotos.length} photo(s) over 20MB skipped.`);
  }
  const sizedPhotos = validPhotos.filter((f) => f.size <= MEDIA_LIMITS.maxPhotoSizeBytes);

  const validVideos: File[] = [];
  for (const vid of videos) {
    if (vid.size > MEDIA_LIMITS.maxVideoSizeBytes) {
      errors.push(`"${vid.name}" exceeds 5GB limit.`);
      continue;
    }
    try {
      const dur = await checkVideoDuration(vid);
      if (dur > MEDIA_LIMITS.maxVideoDurationSeconds) {
        errors.push(`"${vid.name}" is ${Math.round(dur)}s — max ${MEDIA_LIMITS.maxVideoDurationSeconds}s.`);
        continue;
      }
    } catch {
      errors.push(`Could not read "${vid.name}" duration — skipped.`);
      continue;
    }
    validVideos.push(vid);
  }

  return { sizedPhotos, validVideos, errors };
};

// Backward-compatible alias for earlier refactors.
export const splitAndValidateMediaSelection = validateMediaSelection;

export const buildRegisterBody = (input: RegisterAssetRequest): RegisterAssetRequest => ({
  ownerType: input.ownerType,
  ownerId: input.ownerId,
  filePath: input.filePath,
  filename: input.filename,
  fileSize: input.fileSize,
  mimeType: input.mimeType,
  assetType: input.assetType
});

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

export const directUploadVideo = async (params: {
  accessToken: string;
  ownerType: OwnerType;
  ownerId: string;
  file: File;
  assetType?: AssetType;
}): Promise<DirectUploadResult> => {
  const signedRes = await fetch("/api/assets/signed-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`
    },
    body: JSON.stringify({
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      filename: params.file.name,
      contentType: params.file.type || "video/mp4"
    } satisfies SignedUrlRequest)
  });

  const signedPayload = (await signedRes.json()) as Partial<SignedUrlResponse> & { error?: string };
  if (!signedRes.ok || !signedPayload.signedUrl || !signedPayload.filePath) {
    throw new Error(signedPayload.error ?? "Failed to create signed upload URL.");
  }

  const uploadRes = await fetch(signedPayload.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.file.type || "video/mp4"
    },
    body: params.file
  });
  if (!uploadRes.ok) {
    throw new Error(`Video upload failed (HTTP ${uploadRes.status}).`);
  }

  return { filePath: signedPayload.filePath };
};
