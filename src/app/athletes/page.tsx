"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import type { Athlete, Position, StylePreference } from "@/lib/database.types";
import { US_STATES, POSITIONS, CLASS_YEARS, STYLE_PREFERENCES } from "@/lib/constants";

const emptyForm = {
  name: "",
  position: "QB" as Position,
  class_year: 2026,
  state: "",
  descriptor: "",
  style_preference: "casual" as StylePreference,
  reference_photo_url: "",
  consent_signed: false,
};

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterConsent, setFilterConsent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAthletes = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterPosition) params.set("position", filterPosition);
    if (filterState) params.set("state", filterState);
    if (filterConsent) params.set("consent", filterConsent);

    fetch(`/api/athletes?${params}`)
      .then((r) => r.json())
      .then((d) => setAthletes(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load athletes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAthletes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterPosition, filterState, filterConsent]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: Athlete) => {
    setEditing(a);
    setForm({
      name: a.name,
      position: a.position,
      class_year: a.class_year,
      state: a.state,
      descriptor: a.descriptor,
      style_preference: a.style_preference,
      reference_photo_url: a.reference_photo_url || "",
      consent_signed: a.consent_signed,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.descriptor || !form.state) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/athletes/${editing.id}` : "/api/athletes";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(editing ? "Athlete updated" : "Athlete created");
      setShowModal(false);
      fetchAthletes();
    } catch {
      toast.error("Failed to save athlete");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this athlete?")) return;
    try {
      await fetch(`/api/athletes/${id}`, { method: "DELETE" });
      toast.success("Athlete deleted");
      fetchAthletes();
    } catch {
      toast.error("Failed to delete athlete");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Athletes</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Athlete
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
          />
        </div>
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="bg-brand-card border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All Positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="bg-brand-card border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterConsent}
          onChange={(e) => setFilterConsent(e.target.value)}
          className="bg-brand-card border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Consent: All</option>
          <option value="true">Signed</option>
          <option value="false">Not Signed</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-accent" size={32} />
        </div>
      ) : athletes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No athletes found</p>
          <p className="text-sm">Add your first athlete to get started.</p>
        </div>
      ) : (
        <div className="bg-brand-card rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-gray-400 text-xs uppercase tracking-wide">
                  <th className="p-4">Name</th>
                  <th className="p-4">Position</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Consent</th>
                  <th className="p-4">Style</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {athletes.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 font-medium">{a.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-brand-accent/20 text-brand-accent-hover rounded text-xs">
                        {a.position}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">{a.class_year}</td>
                    <td className="p-4 text-gray-400">{a.state}</td>
                    <td className="p-4">
                      {a.consent_signed ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                    </td>
                    <td className="p-4 text-gray-400 capitalize">
                      {a.style_preference}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors mr-1"
                      >
                        <Edit2 size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card rounded-xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Athlete" : "Add Athlete"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value as Position })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Class Year</label>
                  <select
                    value={form.class_year}
                    onChange={(e) => setForm({ ...form, class_year: parseInt(e.target.value) })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {CLASS_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  State <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="">Select state...</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Descriptor <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.descriptor}
                  onChange={(e) => setForm({ ...form, descriptor: e.target.value })}
                  rows={3}
                  placeholder="Physical description for AI prompts..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Style Preference</label>
                <select
                  value={form.style_preference}
                  onChange={(e) => setForm({ ...form, style_preference: e.target.value as StylePreference })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {STYLE_PREFERENCES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Reference Photo URL
                </label>
                <input
                  type="text"
                  value={form.reference_photo_url}
                  onChange={(e) => setForm({ ...form, reference_photo_url: e.target.value })}
                  placeholder="https://... or upload via Supabase Storage"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={form.consent_signed}
                  onChange={(e) => setForm({ ...form, consent_signed: e.target.checked })}
                  className="w-4 h-4 rounded bg-black/20 border-white/10"
                />
                <label htmlFor="consent" className="text-sm text-gray-300">
                  Consent Signed
                </label>
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
