"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  MEDIA_LIMITS,
  checkVideoDuration,
  directUploadVideo,
} from "@/lib/upload-contracts";

interface AssetUploaderProps {
  ownerType: "athlete" | "brand";
  ownerId: string;
  accessToken: string;
  onUploadComplete: () => void;
  accept?: string;
}

export const AssetUploader = ({
  ownerType,
  ownerId,
  accessToken,
  onUploadComplete,
  accept = "image/*,video/*",
}: AssetUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files ?? []);
    if (rawFiles.length === 0) return;

    const photos = rawFiles.filter((f) => f.type.startsWith("image/"));
    const videos = rawFiles.filter((f) => f.type.startsWith("video/"));
    const errors: string[] = [];

    // Validate photo count
    if (photos.length > MEDIA_LIMITS.MAX_PHOTOS_PER_UPLOAD) {
      errors.push(
        `Max ${MEDIA_LIMITS.MAX_PHOTOS_PER_UPLOAD} photos per upload — only first ${MEDIA_LIMITS.MAX_PHOTOS_PER_UPLOAD} kept.`
      );
    }
    const validPhotos = photos.slice(0, MEDIA_LIMITS.MAX_PHOTOS_PER_UPLOAD);

    // Validate photo sizes
    const oversizedPhotos = validPhotos.filter((f) => f.size > MEDIA_LIMITS.MAX_PHOTO_SIZE);
    if (oversizedPhotos.length > 0) {
      errors.push(`${oversizedPhotos.length} photo(s) over 20MB skipped.`);
    }
    const sizedPhotos = validPhotos.filter((f) => f.size <= MEDIA_LIMITS.MAX_PHOTO_SIZE);

    // Validate video sizes and duration
    const validVideos: File[] = [];
    for (const vid of videos) {
      if (vid.size > MEDIA_LIMITS.MAX_VIDEO_SIZE) {
        errors.push(`"${vid.name}" exceeds 5GB limit.`);
        continue;
      }
      try {
        const dur = await checkVideoDuration(vid);
        if (dur > MEDIA_LIMITS.MAX_VIDEO_DURATION) {
          errors.push(`"${vid.name}" is ${Math.round(dur)}s — max ${MEDIA_LIMITS.MAX_VIDEO_DURATION}s.`);
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
    let uploadedCount = 0;

    // Photos go through existing multipart route (small files, within Vercel limit)
    if (sizedPhotos.length > 0) {
      const formData = new FormData();
      formData.append("owner_type", ownerType);
      formData.append("owner_id", ownerId);
      for (const file of sizedPhotos) formData.append("files", file);

      try {
        const res = await fetch("/api/assets/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const data = await res.json();
        uploadedCount += data.count || 0;
        if (data.error) errors.push(data.error);
      } catch {
        errors.push("Photo upload failed.");
      }
    }

    // Videos go direct-to-Supabase (bypasses Vercel body limit)
    for (const vid of validVideos) {
      setProgress(`Uploading ${vid.name}...`);
      const result = await directUploadVideo(vid, ownerType, ownerId, accessToken);
      if (result.success) {
        uploadedCount++;
      } else {
        errors.push(result.error || `${vid.name} failed.`);
      }
    }

    const msg = `${uploadedCount} uploaded!`;
    setProgress(errors.length > 0 ? `${msg} ${errors.join(" ")}` : msg);
    if (uploadedCount > 0) onUploadComplete();
    setTimeout(() => setProgress(""), 5000);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleUpload}
        className="hidden"
        id={`upload-${ownerId}`}
      />
      <label
        htmlFor={`upload-${ownerId}`}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
          uploading
            ? "bg-neutral-700 text-muted cursor-wait"
            : "bg-accent text-white hover:bg-accent-hover"
        }`}
      >
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Uploading..." : "Upload Files"}
      </label>
      {progress && (
        <p className="text-[11px] text-secondary mt-1 max-w-xs">{progress}</p>
      )}
    </div>
  );
};
