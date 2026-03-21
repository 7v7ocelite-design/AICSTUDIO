"use client";

import { useState } from "react";
import { Plus, Search, CheckCircle2, XCircle, Trash2 } from "lucide-react";

import type { Athlete } from "@/lib/types";
import { useToast } from "@/components/toast";

interface AthletesViewProps {
  athletes: Athlete[];
  accessToken: string;
  onAddAthlete: () => void;
  onSelectAthlete: (athlete: Athlete) => void;
  onAthleteDeleted: (id: string) => void;
}

export const AthletesView = ({ athletes, accessToken, onAddAthlete, onSelectAthlete, onAthleteDeleted }: AthletesViewProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete ${name}? This removes all their assets and generated videos.`)) return;
    try {
      const res = await fetch(`/api/athletes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { onAthleteDeleted(id); toast(`${name} deleted.`, "success"); }
    } catch { toast("Delete failed.", "error"); }
  };

  const filtered = athletes.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.position ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Athletes</h2>
          <p className="text-sm text-secondary mt-1">{athletes.length} athlete{athletes.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="button-primary flex items-center gap-2" onClick={onAddAthlete} type="button"><Plus className="h-4 w-4" /> Add Athlete</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search athletes..." />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((athlete) => (
          <div
            key={athlete.id}
            onClick={() => onSelectAthlete(athlete)}
            className="group cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--border-active)] hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{athlete.name}</p>
                <p className="text-xs text-secondary">{[athlete.position, athlete.class_year, athlete.state].filter(Boolean).join(" · ") || "No details"}</p>
              </div>
              <div className="flex items-center gap-1">
                {athlete.consent_signed ? <CheckCircle2 className="h-4 w-4 text-green-accent" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <button onClick={(e) => handleDelete(e, athlete.id, athlete.name)} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-500 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted line-clamp-2">{athlete.descriptor}</p>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
              <span>{athlete.videos_generated} videos</span>
              <span>{athlete.style_preference ?? "No style pref"}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">{search ? "No athletes match." : "No athletes yet."}</p>}
      </div>
    </div>
  );
};
