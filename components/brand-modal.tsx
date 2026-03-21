"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/toast";

interface BrandModalProps {
  accessToken: string;
  onClose: () => void;
  onCreated: (brand: Record<string, unknown>) => void;
}

export const BrandModal = ({ accessToken, onClose, onCreated }: BrandModalProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [tagline, setTagline] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#CC0000");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) { toast("Brand name is required.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: name.trim(), industry: industry.trim() || null, website: website.trim() || null, tagline: tagline.trim() || null, brand_guidelines: guidelines.trim() || null, primary_color: primaryColor, contact_name: contactName.trim() || null, contact_email: contactEmail.trim() || null })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed");
      toast(`Brand "${name}" created.`, "success");
      onCreated(payload.data);
      onClose();
    } catch (err) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-fade-in mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-semibold">Add Brand</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-secondary hover:bg-[var(--bg-card)] hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><label className="text-xs text-secondary">Brand Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike, Adidas..." /></div>
            <div className="space-y-1"><label className="text-xs text-secondary">Industry</label><input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Sports, Fashion..." /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><label className="text-xs text-secondary">Website</label><input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
            <div className="space-y-1"><label className="text-xs text-secondary">Primary Color</label><input className="input" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><label className="text-xs text-secondary">Tagline</label><input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Just Do It" /></div>
          <div className="space-y-1">
            <label className="text-xs text-secondary">Brand Guidelines &amp; Voice</label>
            <textarea className="input min-h-20" value={guidelines} onChange={(e) => setGuidelines(e.target.value)} placeholder="Describe brand voice, target audience, style preferences. Claude AI reads this to match brand identity in generated content." />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><label className="text-xs text-secondary">Contact Name</label><input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
            <div className="space-y-1"><label className="text-xs text-secondary">Contact Email</label><input className="input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button className="button-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="button-primary" onClick={handleSubmit} disabled={saving} type="button">{saving ? "Saving..." : "Save Brand"}</button>
        </div>
      </div>
    </div>
  );
};
