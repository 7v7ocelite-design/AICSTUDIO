"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";

import type { Athlete } from "@/lib/types";
import { useToast } from "@/components/toast";

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
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !descriptor.trim()) {
      toast("Name and descriptor are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("position", position.trim());
      formData.set("class_year", classYear.trim());
      formData.set("state", state.trim());
      formData.set("descriptor", descriptor.trim());
      formData.set("style_preference", stylePreference.trim());
      formData.set("consent_signed", consentSigned ? "true" : "false");
      if (file) formData.set("reference_photo", file);

      const res = await fetch("/api/athletes", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Failed to create athlete.");

      const photoNote = file ? " Reference photo uploaded." : "";
      toast(`Athlete "${name}" created.${photoNote}`, "success");
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
        className="animate-fade-in mx-4 w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl"
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
          <div className="space-y-1">
            <label className="text-xs text-secondary">Reference Photo</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-neutral-600 bg-neutral-950 px-4 py-3 text-sm text-secondary hover:border-neutral-400">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Click to upload reference photo..."}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
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
