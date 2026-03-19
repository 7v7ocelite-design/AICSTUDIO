"use client";

import { CLASS_YEARS, POSITIONS, STYLE_PREFERENCES, US_STATES } from "@/lib/constants";
import { Athlete } from "@/lib/types";
import { Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  position: "QB",
  class_year: 2026,
  state: "CA",
  descriptor: "",
  style_preference: "streetwear",
  consent_signed: false,
};

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  async function loadAthletes() {
    try {
      setLoading(true);
      const response = await fetch("/api/athletes");
      const json = (await response.json()) as { athletes: Athlete[] };
      setAthletes(json.athletes ?? []);
    } catch {
      toast.error("Failed to load athletes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAthletes();
  }, []);

  const filtered = useMemo(() => {
    return athletes.filter((athlete) => {
      const searchHit =
        athlete.name.toLowerCase().includes(search.toLowerCase()) ||
        athlete.state.toLowerCase().includes(search.toLowerCase()) ||
        athlete.position.toLowerCase().includes(search.toLowerCase());
      const positionHit = positionFilter === "all" || athlete.position === positionFilter;
      const stateHit = stateFilter === "all" || athlete.state === stateFilter;
      const consentHit =
        consentFilter === "all" ||
        (consentFilter === "signed" ? athlete.consent_signed : !athlete.consent_signed);
      return searchHit && positionHit && stateHit && consentHit;
    });
  }, [athletes, search, positionFilter, stateFilter, consentFilter]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)));
      if (photoFile) formData.append("reference_photo", photoFile);

      const response = await fetch("/api/athletes", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create athlete");
      toast.success("Athlete created");
      setForm(emptyForm);
      setPhotoFile(null);
      setShowAdd(false);
      await loadAthletes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    if (!editingAthlete) return;
    try {
      const response = await fetch(`/api/athletes/${editingAthlete.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAthlete),
      });
      if (!response.ok) throw new Error("Failed to update athlete");
      toast.success("Athlete updated");
      setEditingAthlete(null);
      await loadAthletes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/athletes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete athlete");
      toast.success("Athlete deleted");
      await loadAthletes();
      if (editingAthlete?.id === id) setEditingAthlete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Athletes</h1>
          <p className="text-sm text-slate-400">Manage athlete profiles, references, and consent.</p>
        </div>
        <button
          className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold"
          onClick={() => setShowAdd((prev) => !prev)}
        >
          {showAdd ? "Close" : "Add Athlete"}
        </button>
      </div>

      {showAdd ? (
        <form onSubmit={handleCreate} className="card grid gap-3 p-4 md:grid-cols-2">
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={form.position}
            onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
          >
            {POSITIONS.map((position) => (
              <option key={position}>{position}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={form.class_year}
            onChange={(event) => setForm((prev) => ({ ...prev, class_year: Number(event.target.value) }))}
          >
            {CLASS_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={form.state}
            onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
          >
            {US_STATES.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={form.style_preference}
            onChange={(event) => setForm((prev) => ({ ...prev, style_preference: event.target.value }))}
          >
            {STYLE_PREFERENCES.map((style) => (
              <option key={style}>{style}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*"
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          />
          <textarea
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2 md:col-span-2"
            rows={3}
            placeholder="Descriptor"
            value={form.descriptor}
            onChange={(event) => setForm((prev) => ({ ...prev, descriptor: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.consent_signed}
              onChange={(event) => setForm((prev) => ({ ...prev, consent_signed: event.target.checked }))}
            />
            Consent Signed
          </label>
          <button className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold md:col-span-2">
            Save Athlete
          </button>
        </form>
      ) : null}

      <div className="card p-4">
        <div className="mb-4 grid gap-2 md:grid-cols-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-900/70 py-2 pl-8 pr-3"
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
          >
            <option value="all">All positions</option>
            {POSITIONS.map((position) => (
              <option key={position}>{position}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="all">All states</option>
            {US_STATES.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={consentFilter}
            onChange={(event) => setConsentFilter(event.target.value)}
          >
            <option value="all">All consent</option>
            <option value="signed">Signed</option>
            <option value="not_signed">Not signed</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading athletes...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Photo</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Position</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Consent</th>
                  <th className="py-2 pr-3">Videos</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((athlete) => (
                  <tr
                    key={athlete.id}
                    className="border-t border-slate-700/70 hover:bg-slate-900/40"
                    onClick={() => setEditingAthlete(athlete)}
                  >
                    <td className="py-2 pr-3">
                      {athlete.reference_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={athlete.reference_photo_url}
                          alt={athlete.name}
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-slate-700" />
                      )}
                    </td>
                    <td className="py-2 pr-3">{athlete.name}</td>
                    <td className="py-2 pr-3">{athlete.position}</td>
                    <td className="py-2 pr-3">{athlete.class_year}</td>
                    <td className="py-2 pr-3">{athlete.state}</td>
                    <td className="py-2 pr-3">
                      {athlete.consent_signed ? (
                        <span className="text-emerald-300">✓ Signed</span>
                      ) : (
                        <span className="text-rose-300">✗ Missing</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">-</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="rounded border border-rose-500/50 px-2 py-1 text-xs text-rose-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(athlete.id);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingAthlete ? (
        <form onSubmit={handleUpdate} className="card grid gap-3 p-4 md:grid-cols-2">
          <h2 className="text-lg font-semibold md:col-span-2">Edit Athlete</h2>
          <input
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={editingAthlete.name}
            onChange={(event) => setEditingAthlete((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
          />
          <input
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={editingAthlete.state}
            onChange={(event) => setEditingAthlete((prev) => (prev ? { ...prev, state: event.target.value } : prev))}
          />
          <textarea
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2 md:col-span-2"
            value={editingAthlete.descriptor}
            onChange={(event) =>
              setEditingAthlete((prev) => (prev ? { ...prev, descriptor: event.target.value } : prev))
            }
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={editingAthlete.consent_signed}
              onChange={(event) =>
                setEditingAthlete((prev) => (prev ? { ...prev, consent_signed: event.target.checked } : prev))
              }
            />
            Consent Signed
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold">Save Changes</button>
            <button
              type="button"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold"
              onClick={() => setEditingAthlete(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
