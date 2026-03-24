"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

const MAX_PHOTOS_PER_UPLOAD = 5;
const MAX_VIDEO_DURATION = 15; // seconds
const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

interface AssetUploaderProps {
  ownerType: "athlete" | "brand";
  ownerId: string;
  accessToken: string;
  onUploadComplete: () => void;
  accept?: string;
}

function checkVideoDuration(file: File): Promise<number> {
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

interface SignedUrlPayload {
  signedUrl?: string;
  filePath?: string;
  token?: string;
  error?: string;
}

interface RegisterPayload {
  error?: string;
}

export const AssetUploader = ({ ownerType, ownerId, accessToken, onUploadComplete, accept = "image/*,video/*" }: AssetUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files ?? []);
    if (rawFiles.length === 0) return;

    // Split into photos and videos
    const photos = rawFiles.filter(f => f.type.startsWith("image/"));
    const videos = rawFiles.filter(f => f.type.startsWith("video/"));
    const errors: string[] = [];

    // Validate photo count
    if (photos.length > MAX_PHOTOS_PER_UPLOAD) {
      errors.push(`Max ${MAX_PHOTOS_PER_UPLOAD} photos per upload — only first ${MAX_PHOTOS_PER_UPLOAD} kept.`);
    }
    const validPhotos = photos.slice(0, MAX_PHOTOS_PER_UPLOAD);

    // Validate photo sizes
    const oversizedPhotos = validPhotos.filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversizedPhotos.length > 0) {
      errors.push(`${oversizedPhotos.length} photo(s) over 20MB skipped.`);
    }
    const sizedPhotos = validPhotos.filter(f => f.size <= MAX_PHOTO_SIZE);

    // Validate video sizes and duration
    const validVideos: File[] = [];
    for (const vid of videos) {
      if (vid.size > MAX_VIDEO_SIZE) {
        errors.push(`"${vid.name}" exceeds 50MB limit.`);
        continue;
      }
      try {
        const dur = await checkVideoDuration(vid);
        if (dur > MAX_VIDEO_DURATION) {
          errors.push(`"${vid.name}" is ${Math.round(dur)}s — max ${MAX_VIDEO_DURATION}s.`);
          continue;
        }
      } catch {
        errors.push(`Could not read "${vid.name}" duration — skipped.`);
        continue;
      }
      validVideos.push(vid);
    }

    if (sizedPhotos.length === 0 && validVideos.length === 0) {
      setProgress(errors.join(" "));
      setTimeout(() => setProgress(""), 5000);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    const totalFiles = sizedPhotos.length + validVideos.length;
    setProgress(`Uploading ${totalFiles} file${totalFiles > 1 ? "s" : ""}...`);

    const uploadErrors = [...errors];

    // Photos continue using existing API path.
    if (sizedPhotos.length > 0) {
      const formData = new FormData();
      formData.append("owner_type", ownerType);
      formData.append("owner_id", ownerId);
      for (const file of sizedPhotos) formData.append("files", file);

      try {
        const res = await fetch("/api/assets/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData
        });
        const data = await res.json();
        if (data.error) {
          uploadErrors.push(`Photo upload failed: ${data.error}`);
        } else if (Array.isArray(data.warnings)) {
          uploadErrors.push(...data.warnings.map((w: string) => `Photo: ${w}`));
        }
      } catch {
        uploadErrors.push("Photo upload failed");
      }
    }

    // Videos use direct-to-storage signed uploads.
    for (const video of validVideos) {
      try {
        const signedRes = await fetch("/api/assets/signed-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            ownerType,
            ownerId,
            filename: video.name,
            contentType: video.type || "video/mp4"
          })
        });
        const signed = (await signedRes.json()) as SignedUrlPayload;
        if (!signedRes.ok || !signed.signedUrl || !signed.filePath || !signed.token) {
          throw new Error(signed.error ?? "Failed to obtain signed upload URL");
        }

        const uploadRes = await fetch(signed.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": video.type || "video/mp4",
            "x-upsert": "true"
          },
          body: video
        });

        if (!uploadRes.ok) {
          throw new Error(`Storage upload failed (HTTP ${uploadRes.status})`);
        }

        const registerRes = await fetch("/api/assets/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            ownerType,
            ownerId,
            filePath: signed.filePath,
            filename: video.name,
            fileSize: video.size,
            mimeType: video.type || "video/mp4",
            assetType: "video"
          })
        });
        const registerPayload = (await registerRes.json()) as RegisterPayload;
        if (!registerRes.ok) {
          throw new Error(registerPayload.error ?? "Failed to register uploaded video");
        }
      } catch (err) {
        uploadErrors.push(err instanceof Error ? `${video.name}: ${err.message}` : `${video.name}: upload failed`);
      }
    }

    if (uploadErrors.length > 0) {
      setProgress(`Upload finished with warnings. ${uploadErrors.join(" ")}`);
    } else {
      setProgress(`${totalFiles} uploaded!`);
    }

    onUploadComplete();
    setTimeout(() => setProgress(""), 5000);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept={accept} onChange={handleUpload} className="hidden" id={`upload-${ownerId}`} />
      <label htmlFor={`upload-${ownerId}`} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${uploading ? "bg-neutral-700 text-muted cursor-wait" : "bg-accent text-white hover:bg-accent-hover"}`}>
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Uploading..." : "Upload Files"}
      </label>
      {progress && <p className="text-[11px] text-secondary mt-1 max-w-xs">{progress}</p>}
    </div>
  );
};
