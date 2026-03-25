"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { Template } from "@/lib/types";
import { useToast } from "@/components/toast";

interface TemplateModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: (template: Template) => void;
}

export const TemplateModal = ({ accessToken, onClose, onCreated }: TemplateModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("");
  const [variantName, setVariantName] = useState("");
  const [action, setAction] = useState("");
  const [location, setLocation] = useState("");
  const [wardrobe, setWardrobe] = useState("");
  const [lighting, setLighting] = useState("");
  const [cameraAngle, setCameraAngle] = useState("");
  const [audioTrack, setAudioTrack] = useState("");
  const [contentTier, setContentTier] = useState("standard");
  const [platforms, setPlatforms] = useState("");
  const [renderEngine, setRenderEngine] = useState<"runway" | "creatomate">("runway");
  const [creatomateTemplateId, setCreatomateTemplateId] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");

  const handleSubmit = async () => {
    if (!category.trim() || !variantName.trim() || !action.trim() || !location.trim() || !wardrobe.trim() || !lighting.trim() || !cameraAngle.trim()) {
      toast("All required fields must be filled.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          category: category.trim(), variant_name: variantName.trim(), action: action.trim(),
          location: location.trim(), wardrobe: wardrobe.trim(), lighting: lighting.trim(),
          camera_angle: cameraAngle.trim(), audio_track: audioTrack.trim() || null,
          content_tier: contentTier, platforms: platforms.trim() || null,
          render_engine: renderEngine,
          creatomate_template_id: renderEngine === "creatomate" ? creatomateTemplateId.trim() : null,
          preview_video_url: previewVideoUrl.trim() || null
        })
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Failed to create template.");
      toast(`Template "${category} – ${variantName}" created.`, "success");
      onCreated(payload.data as Template);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create template.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-fade-in mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-semibold">Add Template</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-secondary hover:bg-[var(--bg-card)] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Category *</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Jet Arrival" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">Variant Name *</label>
              <input className="input" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="V1" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-secondary">Action *</label>
            <textarea className="input min-h-16" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Steps off private jet onto tarmac" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Location *</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Luxury airport tarmac" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">Wardrobe *</label>
              <input className="input" value={wardrobe} onChange={(e) => setWardrobe(e.target.value)} placeholder="Designer travel outfit" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Lighting *</label>
              <input className="input" value={lighting} onChange={(e) => setLighting(e.target.value)} placeholder="Golden hour backlight" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">Camera Angle *</label>
              <input className="input" value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} placeholder="Wide tracking shot" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Audio Track</label>
              <input className="input" value={audioTrack} onChange={(e) => setAudioTrack(e.target.value)} placeholder="jet_arrival_epic_01" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-secondary">Content Tier *</label>
              <select className="input" value={contentTier} onChange={(e) => setContentTier(e.target.value)}>
                <option value="standard">standard</option>
                <option value="premium">premium</option>
                <option value="social">social</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-secondary">Platforms</label>
            <input className="input" value={platforms} onChange={(e) => setPlatforms(e.target.value)} placeholder="tiktok,instagram,youtube" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-secondary">Render Engine *</label>
              <select className="input" value={renderEngine} onChange={(e) => setRenderEngine(e.target.value as "runway" | "creatomate")}>
                <option value="runway">Runway (AI Generated)</option>
                <option value="creatomate">Creatomate (Template Video)</option>
              </select>
            </div>
            {renderEngine === "creatomate" && (
              <div className="space-y-1">
                <label className="text-xs text-secondary">Creatomate Template ID *</label>
                <input className="input font-mono text-xs" value={creatomateTemplateId} onChange={(e) => setCreatomateTemplateId(e.target.value)} placeholder="abc123..." />
              </div>
            )}
          </div>
          {renderEngine === "creatomate" && (
            <div className="space-y-1">
              <label className="text-xs text-secondary">Preview Video URL</label>
              <input className="input text-xs" value={previewVideoUrl} onChange={(e) => setPreviewVideoUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button className="button-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" onClick={handleSubmit} disabled={saving} type="button">
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
};
