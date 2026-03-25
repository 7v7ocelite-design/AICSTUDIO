"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import {
  directUploadVideo,
  splitAndValidateMediaSelection
} from "@/lib/upload-contracts";

interface AssetUploaderProps {
  ownerType: "athlete" | "brand";
  ownerId: string;
  accessToken: string;
  onUploadComplete: () => void;
  accept?: string;
}

export const AssetUploader = ({ ownerType, ownerId, accessToken, onUploadComplete, accept = "image/*,video/*" }: AssetUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files ?? []);
    if (rawFiles.length === 0) return;

    const { sizedPhotos, validVideos, errors } = await splitAndValidateMediaSelection(rawFiles);

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
        await directUploadVideo({
          accessToken,
          ownerType,
          ownerId,
          file: video,
          assetType: "video"
        });
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
