"use client";

import { useRef, useState } from "react";
import { X, Upload, Film, Trash2 } from "lucide-react";

import type { Athlete } from "@/lib/types";
import { useToast } from "@/components/toast";

const MAX_PHOTOS = 5;
const MAX_VIDEO_DURATION = 15; // seconds
const MAX_PHOTO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

interface AthleteModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: (athlete: Athlete) => void;
}

export const AthleteModal = ({ accessToken, onClose, onCreated }: AthleteModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [classYear, setClassYear] = useState("");
  const [state, setState] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [stylePreference, setStylePreference] = useState("");
  const [consentSigned, setConsentSigned] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoError, setVideoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (files.length > remaining) {
      toast(`You can upload up to ${MAX_PHOTOS} photos total. ${remaining} slot${remaining !== 1 ? "s" : ""} remaining.`, "error");
    }

    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter(f => f.size > MAX_PHOTO_SIZE);
    if (oversized.length > 0) {
      toast(`${oversized.length} photo(s) exceed 20MB and were skipped.`, "error");
    }

    const valid = toAdd.filter(f => f.size <= MAX_PHOTO_SIZE);
    setPhotos(prev => [...prev, ...valid]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError("");

    if (file.size > MAX_VIDEO_SIZE) {
      setVideoError("Video must be under 50MB.");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    // Check duration using HTML5 video element
    const url = URL.createObjectURL(file);
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.src = url;

    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (videoEl.duration > MAX_VIDEO_DURATION) {
        setVideoError(`Video is ${Math.round(videoEl.duration)}s — max is ${MAX_VIDEO_DURATION}s.`);
        setVideo(null);
      } else {
        setVideo(file);
        setVideoError("");
      }
    };

    videoEl.onerror = () => {
      URL.revokeObjectURL(url);
      setVideoError("Could not read video file. Try a different format.");
    };

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!name.trim() || !descriptor.trim()) {
      toast("Name and descriptor are required.", "error");
      return;
    }
    setSaving(true);
    try {
      let uploadedVideoPath: string | null = null;
      let uploadedVideoFileName: string | null = null;
      let uploadedVideoMimeType: string | null = null;
      let uploadedVideoSize: number | null = null;

      if (video) {
        const signedRes = await fetch("/api/assets/signed-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            ownerType: "athlete",
            ownerId: "pending",
            filename: video.name,
            contentType: video.type || "video/mp4"
          })
        });
        const signedPayload = await signedRes.json();
        if (!signedRes.ok || !signedPayload?.signedUrl || !signedPayload?.filePath) {
          throw new Error(signedPayload?.error ?? "Failed to create signed upload URL for video.");
        }

        const uploadRes = await fetch(signedPayload.signedUrl as string, {
          method: "PUT",
          body: video,
          headers: { "Content-Type": video.type || "video/mp4" }
        });
        if (!uploadRes.ok) {
          throw new Error(`Video upload failed (HTTP ${uploadRes.status}).`);
        }

        uploadedVideoPath = signedPayload.filePath as string;
        uploadedVideoFileName = video.name;
        uploadedVideoMimeType = video.type || "video/mp4";
        uploadedVideoSize = video.size;
      }

      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("position", position.trim());
      formData.set("class_year", classYear.trim());
      formData.set("state", state.trim());
      formData.set("descriptor", descriptor.trim());
      formData.set("style_preference", stylePreference.trim());
      formData.set("consent_signed", consentSigned ? "true" : "false");

      // First photo becomes reference_photo, all photos go as reference_photos
      for (const photo of photos) {
        formData.append("reference_photos", photo);
      }
      if (video) {
        if (!uploadedVideoPath) {
          throw new Error("Video upload path missing after upload.");
        }
        formData.set("reference_video_url", uploadedVideoPath);
        formData.set("reference_video_filename", uploadedVideoFileName ?? "reference-video.mp4");
        formData.set("reference_video_mime_type", uploadedVideoMimeType ?? "video/mp4");
        formData.set("reference_video_size", String(uploadedVideoSize ?? 0));
      }

      const res = await fetch("/api/athletes", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Failed to create athlete.");

      const fileCount = photos.length + (video ? 1 : 0);
      const mediaNote = fileCount > 0 ? ` ${photos.length} photo${photos.length !== 1 ? "s" : ""}${video ? " + video" : ""} uploaded.` : "";
      toast(`Athlete "${name}" created.${mediaNote}`, "success");
      onCreated(payload.data as Athlete);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create athlete.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-fade-in mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-semibold">Add Athlete</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-secondary hover:bg-[var(--bg-card)] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Name *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Athlete name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">Position</label>
              <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="QB, WR, etc." />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Class Year</label>
              <input className="input" value={classYear} onChange={(e) => setClassYear(e.target.value)} placeholder="2026" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">State</label>
              <input className="input" value={state} onChange={(e) => setState(e.target.value)} placeholder="California" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-secondary">Physical Descriptor *</label>
            <textarea className="input min-h-20" value={descriptor} onChange={(e) => setDescriptor(e.target.value)} placeholder="Athletic build, 6ft 2in, dark hair..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-secondary">Style Preference</label>
            <input className="input" value={stylePreference} onChange={(e) => setStylePreference(e.target.value)} placeholder="Streetwear, luxury, athleisure..." />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" className="h-4 w-4 accent-[var(--aic-red)]" checked={consentSigned} onChange={(e) => setConsentSigned(e.target.checked)} />
              Signed consent &amp; usage release on file
            </label>
          </div>

          {/* Multi-Photo Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-secondary">Reference Photos (up to {MAX_PHOTOS})</label>
              <span className="text-[10px] text-muted">{photos.length}/{MAX_PHOTOS}</span>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-950 border border-[var(--border-subtle)]">
                    <img src={URL.createObjectURL(photo)} alt={photo.name} className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-[var(--aic-red)]/80 text-[8px] text-white text-center py-0.5">PRIMARY</span>}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-900/80 hover:bg-red-700 rounded text-[10px] text-white transition-opacity"
                    ><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < MAX_PHOTOS && (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-neutral-600 bg-neutral-950 px-4 py-3 text-sm text-secondary hover:border-neutral-400">
                <Upload className="h-4 w-4" />
                {photos.length === 0 ? "Click to upload reference photos..." : `Add more photos (${MAX_PHOTOS - photos.length} remaining)...`}
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
              </label>
            )}
            <p className="text-[10px] text-muted">First photo becomes the primary reference. Upload from different angles for best results.</p>
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <label className="text-xs text-secondary">Reference Video (optional, max {MAX_VIDEO_DURATION}s)</label>
            {video ? (
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-neutral-950 px-4 py-3">
                <Film className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="text-sm text-[var(--text-primary)] truncate flex-1">{video.name}</span>
                <button type="button" onClick={() => setVideo(null)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-neutral-600 bg-neutral-950 px-4 py-3 text-sm text-secondary hover:border-neutral-400">
                <Film className="h-4 w-4" />
                Click to upload reference video...
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              </label>
            )}
            {videoError && <p className="text-[11px] text-red-400">{videoError}</p>}
            <p className="text-[10px] text-muted">Short clips help the AI capture movement style and mannerisms.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button className="button-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" onClick={handleSubmit} disabled={saving} type="button">
            {saving ? "Saving..." : "Save Athlete"}
          </button>
        </div>
      </div>
    </div>
  );
};
