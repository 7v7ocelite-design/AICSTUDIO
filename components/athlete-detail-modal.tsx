"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Save } from "lucide-react";

import type { Athlete } from "@/lib/types";
import { AssetUploader } from "@/components/asset-uploader";
import { AssetGrid } from "@/components/asset-grid";
import { useToast } from "@/components/toast";

interface AthleteDetailModalProps {
  athlete: Athlete;
  accessToken: string;
  onClose: () => void;
  onUpdated: (athlete: Athlete) => void;
}

interface Asset { id: string; url: string; filename: string; asset_type: string; label?: string; }

export const AthleteDetailModal = ({ athlete, accessToken, onClose, onUpdated }: AthleteDetailModalProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...athlete });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saving, setSaving] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets?owner_type=athlete&owner_id=${athlete.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { const d = await res.json(); setAssets(d.data ?? []); }
    } catch { /* ignore */ }
  }, [athlete.id, accessToken]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/athletes/${athlete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: form.name, position: form.position, class_year: form.class_year,
          state: form.state, descriptor: form.descriptor, style_preference: form.style_preference,
          consent_signed: form.consent_signed
        })
      });
      if (res.ok) {
        const d = await res.json();
        onUpdated(d.data);
        toast("Profile updated.", "success");
        setEditing(false);
      }
    } catch { toast("Update failed.", "error"); }
    finally { setSaving(false); }
  };

  const handleDeleteAsset = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const field = (label: string, key: keyof typeof form, multiline?: boolean) => (
    <div className="space-y-1">
      <label className="text-[10px] text-muted uppercase tracking-wider">{label}</label>
      {editing ? (
        multiline ? (
          <textarea className="input min-h-16 text-xs" value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        ) : (
          <input className="input text-xs" value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        )
      ) : (
        <p className="text-sm text-[var(--text-primary)]">{(form[key] as string) || "—"}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-fade-in mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-semibold">{athlete.name}</h2>
          <div className="flex items-center gap-2">
            {editing ? (
              <button onClick={handleSave} disabled={saving} className="button-primary py-1.5 px-3 text-xs flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save"}
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs text-accent hover:text-accent-hover">Edit Profile</button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-secondary hover:bg-[var(--bg-card)] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {field("Name", "name")}
            {field("Position", "position")}
            {field("Class Year", "class_year")}
            {field("State", "state")}
            {field("Style Preference", "style_preference")}
            <div className="space-y-1">
              <label className="text-[10px] text-muted uppercase tracking-wider">Consent</label>
              {editing ? (
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.consent_signed} onChange={(e) => setForm({ ...form, consent_signed: e.target.checked })} className="h-4 w-4 accent-accent" />
                  Signed release on file
                </label>
              ) : (
                <p className={`text-sm ${form.consent_signed ? "text-green-accent" : "text-red-500"}`}>{form.consent_signed ? "✓ Signed" : "✗ Not signed"}</p>
              )}
            </div>
          </div>
          {field("Physical Descriptor", "descriptor", true)}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-secondary">Reference Assets</h3>
              <AssetUploader ownerType="athlete" ownerId={athlete.id} accessToken={accessToken} onUploadComplete={loadAssets} />
            </div>
            <p className="text-[10px] text-muted mb-2">Upload 3-5 photos (different angles) + optional video. More references = more lifelike AI content.</p>
            <AssetGrid assets={assets} onDelete={handleDeleteAsset} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-secondary mb-1">Stats</h3>
            <p className="text-xs text-muted">{athlete.videos_generated} videos generated</p>
          </div>
        </div>
      </div>
    </div>
  );
};
