"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Trash2,
  Edit2,
  Music,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import type { Template, ContentTier } from "@/lib/database.types";

const tierBadge: Record<string, { color: string; dot: string; label: string }> = {
  premium: { color: "text-yellow-400", dot: "bg-yellow-400", label: "Premium" },
  standard: { color: "text-green-400", dot: "bg-green-400", label: "Standard" },
  social: { color: "text-blue-400", dot: "bg-blue-400", label: "Social" },
};

const emptyForm = {
  category: "",
  variant: "",
  action: "",
  location: "",
  wardrobe: "",
  lighting: "",
  camera_angle: "",
  audio_track: "",
  platforms: "",
  content_tier: "standard" as ContentTier,
};

export default function TemplatesPage() {
  const [grouped, setGrouped] = useState<Record<string, Template[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setGrouped(d.grouped || {}))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleCategory = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      category: t.category,
      variant: t.variant,
      action: t.action,
      location: t.location,
      wardrobe: t.wardrobe,
      lighting: t.lighting,
      camera_angle: t.camera_angle,
      audio_track: t.audio_track,
      platforms: t.platforms,
      content_tier: t.content_tier,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.variant || !form.action) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Template updated" : "Template created");
      setShowModal(false);
      fetchTemplates();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-accent" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Template
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([category, items]) => {
          const isExpanded = expanded.has(category);
          const badge = tierBadge[items[0]?.content_tier] || tierBadge.standard;

          return (
            <div
              key={category}
              className="bg-brand-card rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={18} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={18} className="text-gray-400 shrink-0" />
                )}
                <span className="font-medium flex-1">{category}</span>
                <span className="text-xs text-gray-400">
                  {items.length} variants
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-white/5 ${badge.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {items.map((t) => (
                    <div key={t.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                        onClick={() =>
                          setExpandedRow(expandedRow === t.id ? null : t.id)
                        }
                      >
                        <span className="text-sm font-medium flex-1">
                          {t.variant}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={12} />
                          {t.location}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Music size={12} />
                          {t.audio_track}
                        </span>
                        <span className="text-xs text-gray-500">
                          {t.platforms}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(t);
                          }}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Edit2 size={14} className="text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                      {expandedRow === t.id && (
                        <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-xs bg-black/10">
                          <div>
                            <span className="text-gray-500">Action:</span>
                            <p className="text-gray-300 mt-0.5">{t.action}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Wardrobe:</span>
                            <p className="text-gray-300 mt-0.5">{t.wardrobe}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Lighting:</span>
                            <p className="text-gray-300 mt-0.5">{t.lighting}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Camera:</span>
                            <p className="text-gray-300 mt-0.5">{t.camera_angle}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card rounded-xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Template" : "Add Template"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category *</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Variant *</label>
                  <input
                    type="text"
                    value={form.variant}
                    onChange={(e) => setForm({ ...form, variant: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Action *</label>
                <textarea
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  rows={2}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Wardrobe</label>
                <input
                  type="text"
                  value={form.wardrobe}
                  onChange={(e) => setForm({ ...form, wardrobe: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lighting</label>
                  <input
                    type="text"
                    value={form.lighting}
                    onChange={(e) => setForm({ ...form, lighting: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Camera Angle</label>
                  <input
                    type="text"
                    value={form.camera_angle}
                    onChange={(e) => setForm({ ...form, camera_angle: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Audio Track</label>
                  <input
                    type="text"
                    value={form.audio_track}
                    onChange={(e) => setForm({ ...form, audio_track: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Platforms</label>
                  <input
                    type="text"
                    value={form.platforms}
                    onChange={(e) => setForm({ ...form, platforms: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Content Tier</label>
                <select
                  value={form.content_tier}
                  onChange={(e) => setForm({ ...form, content_tier: e.target.value as ContentTier })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="premium">Premium (Runway Gen-4.5)</option>
                  <option value="standard">Standard (Kling 3.0)</option>
                  <option value="social">Social (Vidu Q3 Pro)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
