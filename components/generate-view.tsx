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
}

const scoreColor = (score: number | null) => {
  if (score === null) return "bg-neutral-700 text-neutral-300";
  if (score >= 90) return "bg-emerald-900 text-emerald-200";
  if (score >= 85) return "bg-amber-900 text-amber-200";
  return "bg-rose-900 text-rose-200";
};

export const GenerateView = ({
  athletes, templates, jobs, accessToken, onJobCreated
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

  const pollForCompletion = async (jobId: string) => {
    const maxPolls = 60; // 60 x 10s = 10 minutes
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        const job = await res.json();
        if (job.status === "completed") {
          onJobCreated(job as Job); // update with video_url
          toast("Video ready!", "success");
          return;
        }
        if (job.status === "failed") {
          onJobCreated(job as Job);
          toast(`Generation failed: ${job.error_message || "Unknown error"}`, "error");
          return;
        }
        // Still processing — update toast
        const elapsed = (i + 1) * 10;
        toast(`Generating with Runway... (${elapsed}s elapsed)`, "info");
      } catch {
        // network error — keep trying
      }
    }
    toast("Timed out waiting for video. Check job queue.", "error");
  };

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
      onJobCreated(payload.data as Job);

      if (payload.polling && payload.data.id) {
        toast("Video generating with Runway... (2-4 minutes)", "info");
        await pollForCompletion(payload.data.id);
      } else {
        toast(`Generation completed: ${payload.data.status}.`, "success");
      }
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
