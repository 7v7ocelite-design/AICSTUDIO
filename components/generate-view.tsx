"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { Athlete, Job, Template } from "@/lib/types";
import { useToast } from "@/components/toast";

interface GenerateViewProps {
  athletes: Athlete[];
  templates: Template[];
  jobs: Job[];
  accessToken: string;
  onJobCreated: (job: Job) => void;
  onSeedTemplates: () => Promise<void>;
}

const scoreColor = (score: number | null) => {
  if (score === null) return "bg-neutral-700 text-neutral-300";
  if (score >= 90) return "bg-emerald-900 text-emerald-200";
  if (score >= 85) return "bg-amber-900 text-amber-200";
  return "bg-rose-900 text-rose-200";
};

export const GenerateView = ({
  athletes, templates, jobs, accessToken, onJobCreated, onSeedTemplates
}: GenerateViewProps) => {
  const { toast } = useToast();
  const [selectedAthlete, setSelectedAthlete] = useState(athletes[0]?.id ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);

  const activeAthlete = athletes.find((a) => a.id === selectedAthlete) ?? null;
  const consentMissing = activeAthlete !== null && !activeAthlete.consent_signed;

  const groupedTemplates: Array<{ category: string; items: Template[] }> = [];
  const map = new Map<string, Template[]>();
  for (const t of templates) {
    const arr = map.get(t.category) ?? [];
    arr.push(t);
    map.set(t.category, arr);
  }
  for (const [category, items] of map) {
    groupedTemplates.push({ category, items });
  }

  const handleGenerate = async () => {
    if (!selectedAthlete || !selectedTemplate) { toast("Select both athlete and template.", "error"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ athleteId: selectedAthlete, templateId: selectedTemplate })
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Generation failed.");
      toast(`Generation completed: ${payload.data.status}.`, "success");
      onJobCreated(payload.data as Job);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const recentJobs = jobs.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Generate Video</h2>
        <p className="text-sm text-secondary mt-1">Select athlete + template, then launch one-click AI video production.</p>
      </div>

      {templates.length === 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-sm text-secondary mb-3">No templates found. Seed the default 45 V5 templates to get started.</p>
          <button className="button-primary px-8 py-3" onClick={onSeedTemplates} type="button">
            Seed Default Templates (15 × 3)
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-secondary">Athlete</label>
            <select className="input" value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
              <option value="">Select athlete</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.consent_signed ? "✓" : "✗"} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-secondary">Template</label>
            <select className="input" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              <option value="">Select template</option>
              {groupedTemplates.map((g) => (
                <optgroup key={g.category} label={`— ${g.category} —`}>
                  {g.items.map((t) => (
                    <option key={t.id} value={t.id}>{t.category} – {t.variant_name} ({t.content_tier})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <button
          className="button-primary w-full py-3.5 text-base font-bold tracking-wide"
          disabled={generating || consentMissing || !selectedAthlete || !selectedTemplate}
          onClick={handleGenerate}
          type="button"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Generating...</span>
          ) : (
            "GENERATE FINISHED VIDEO"
          )}
        </button>

        {consentMissing && (
          <p className="rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">
            ⚠ Consent release not signed. Upload signed release before generating content.
          </p>
        )}
      </div>

      {/* Recent Output */}
      {recentJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary mb-3">Recent Output</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex-shrink-0 w-40 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--border-active)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${scoreColor(job.face_score)}`}>
                    {job.face_score?.toFixed(0) ?? "—"}%
                  </span>
                  <span className="text-[10px] text-muted">{job.engine_used ?? ""}</span>
                </div>
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{job.athlete?.name ?? "Unknown"}</p>
                <p className="text-[10px] text-muted truncate">{job.template?.category ?? ""} {job.template?.variant_name ?? ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
