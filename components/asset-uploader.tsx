"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);

    const formData = new FormData();
    formData.append("owner_type", ownerType);
    formData.append("owner_id", ownerId);
    for (const file of Array.from(files)) formData.append("files", file);

    try {
      const res = await fetch("/api/assets/upload", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: formData });
      const data = await res.json();
      setProgress(data.error ? `Error: ${data.error}` : `${data.count} uploaded!`);
      if (!data.error) onUploadComplete();
      setTimeout(() => setProgress(""), 3000);
    } catch { setProgress("Upload failed"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept={accept} onChange={handleUpload} className="hidden" id={`upload-${ownerId}`} />
      <label htmlFor={`upload-${ownerId}`} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${uploading ? "bg-neutral-700 text-muted cursor-wait" : "bg-accent text-white hover:bg-accent-hover"}`}>
        <Upload className="h-3.5 w-3.5" />
        {uploading ? "Uploading..." : "Upload Files"}
      </label>
      {progress && <p className="text-[11px] text-secondary mt-1">{progress}</p>}
    </div>
  );
};
