"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";

import type { Athlete, DashboardBootstrap, Job, Template } from "@/lib/types";
import { SettingsPanel } from "@/components/settings-panel";
import { JobQueues } from "@/components/job-queues";

interface DashboardProps {
  accessToken: string;
  onSignOut: () => Promise<unknown>;
}

export const Dashboard = ({ accessToken }: DashboardProps) => {
  const [data, setData] = useState<DashboardBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAthleteForm, setShowAthleteForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bootstrap", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = (await response.json()) as { data?: DashboardBootstrap; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to load dashboard data.");
      }
      const bootstrap = payload.data;

      setData(bootstrap);
      setSelectedAthlete((current) => current || bootstrap.athletes[0]?.id || "");
      setSelectedTemplate((current) => current || bootstrap.templates[0]?.id || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  const activeAthlete = data?.athletes.find((a) => a.id === selectedAthlete) ?? null;
  const consentMissing = activeAthlete !== null && !activeAthlete.consent_signed;

  const runGeneration = async (athleteId?: string, templateId?: string) => {
    const aId = athleteId ?? selectedAthlete;
    const tId = templateId ?? selectedTemplate;
    if (!aId || !tId) {
      setError("Select both athlete and template.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ athleteId: aId, templateId: tId })
      });

      const payload = (await response.json()) as { data?: Job; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to generate video.");
      }

      setData((current) =>
        current
          ? { ...current, jobs: [payload.data as Job, ...current.jobs] }
          : current
      );
      setNotice(`Generation completed: ${payload.data.status}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJobUpdate = (updatedJob: Job) => {
    setData((current) =>
      current
        ? {
            ...current,
            jobs: current.jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j))
          }
        : current
    );
  };

  const handleJobsCreated = (newJobs: Job[]) => {
    setData((current) =>
      current
        ? { ...current, jobs: [...newJobs, ...current.jobs] }
        : current
    );
  };

  const seedTemplates = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/templates/seed", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (response.ok) {
        await fetchBootstrap();
        setNotice("45 default templates seeded successfully.");
      }
    } finally {
      setSeeding(false);
    }
  };

  const createAthlete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/athletes", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const payload = (await response.json()) as { data?: Athlete; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to create athlete.");
      }
      setData((current) =>
        current
          ? { ...current, athletes: [payload.data as Athlete, ...current.athletes] }
          : current
      );
      setSelectedAthlete(payload.data.id);
      setNotice("Athlete profile created.");
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Athlete creation failed.");
    }
  };

  const createTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          category: formData.get("category"),
          variant_name: formData.get("variant_name"),
          action: formData.get("action"),
          location: formData.get("location"),
          wardrobe: formData.get("wardrobe"),
          lighting: formData.get("lighting"),
          camera_angle: formData.get("camera_angle"),
          audio_track: formData.get("audio_track"),
          content_tier: formData.get("content_tier"),
          platforms: formData.get("platforms")
        })
      });
      const payload = (await response.json()) as { data?: Template; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to create template.");
      }
      setData((current) =>
        current
          ? { ...current, templates: [payload.data as Template, ...current.templates] }
          : current
      );
      setSelectedTemplate(payload.data.id);
      setNotice("Template created.");
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Template creation failed.");
    }
  };

  // Group templates by category for dropdown
  const groupedTemplates: Array<{ category: string; items: Template[] }> = [];
  if (data) {
    const map = new Map<string, Template[]>();
    for (const t of data.templates) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    for (const [category, items] of map) {
      groupedTemplates.push({ category, items });
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p className="text-sm text-muted">Loading dashboard…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="panel">
        <p className="text-sm text-rose-400">Unable to load dashboard.</p>
        <button className="button-secondary mt-4" onClick={() => void fetchBootstrap()} type="button">
          Retry
        </button>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="panel flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Image src="/aic-logo.png" alt="AiC" width={72} height={48} className="h-12 w-auto rounded" />
          <div>
            <h1 className="text-2xl font-semibold">Content Studio</h1>
            <p className="mt-1 text-sm text-muted">
              Select athlete + template and launch fully automated AI lifestyle video production.
            </p>
          </div>
        </div>
        <button
          className="button-secondary flex items-center gap-2"
          onClick={() => setShowSettings(!showSettings)}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Settings
        </button>
      </header>

      {showSettings && (
        <SettingsPanel accessToken={accessToken} onClose={() => setShowSettings(false)} />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-white">{data.athletes.length}</p>
          <p className="text-xs text-slate-400 mt-1">Athletes</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-white">{data.templates.length}</p>
          <p className="text-xs text-slate-400 mt-1">Templates</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.jobs.filter((j) => j.status === "approved").length}</p>
          <p className="text-xs text-slate-400 mt-1">Approved</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{data.jobs.filter((j) => j.status === "needs_review").length}</p>
          <p className="text-xs text-slate-400 mt-1">Needs Review</p>
        </div>
      </div>

      {/* Seed Templates prompt */}
      {data.templates.length === 0 && (
        <div className="panel flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-slate-300">No templates found. Seed the default 45 V5 templates to get started.</p>
          <button
            className="button-primary px-8 py-3"
            onClick={seedTemplates}
            disabled={seeding}
            type="button"
          >
            {seeding ? "Seeding…" : "Seed Default Templates (15 × 3)"}
          </button>
        </div>
      )}

      {/* Generation + Queue */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel space-y-5 border-l-4 border-l-accent">
          <div>
            <h2 className="text-lg font-semibold">Generate Video</h2>
            <p className="text-xs text-muted mt-1">Select athlete + template, then launch one-click AI video production.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400" htmlFor="athlete-select">
                Athlete
              </label>
              <select
                id="athlete-select"
                className="input"
                value={selectedAthlete}
                onChange={(event) => setSelectedAthlete(event.target.value)}
              >
                <option value="">Select athlete</option>
                {data.athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.consent_signed ? "✓" : "✗"} {athlete.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400" htmlFor="template-select">
                Template
              </label>
              <select
                id="template-select"
                className="input"
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                <option value="">Select template</option>
                {groupedTemplates.map((group) => (
                  <optgroup key={group.category} label={`— ${group.category} —`}>
                    {group.items.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.category} – {template.variant_name} ({template.content_tier})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <button
            className="button-primary w-full py-3 text-base"
            disabled={isGenerating || consentMissing}
            onClick={() => runGeneration()}
          >
            {isGenerating ? "Generating..." : "Generate Finished Video"}
          </button>

          {consentMissing && (
            <p className="rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">
              ⚠ Consent release not signed. Upload signed release before generating content.
            </p>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-muted">
            <p>Auto-approve threshold: {data.settings.auto_approve_threshold ?? "90"}</p>
            <p>Review threshold: {data.settings.review_threshold ?? "85"}</p>
            <p>Max retries: {data.settings.max_retries ?? "2"}</p>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-400">{notice}</p> : null}
        </div>

        {/* Tabbed Queue View */}
        <JobQueues
          jobs={data.jobs}
          settings={data.settings}
          accessToken={accessToken}
          onJobUpdate={handleJobUpdate}
          onJobsCreated={handleJobsCreated}
          onRegenerate={(athleteId, templateId) => void runGeneration(athleteId, templateId)}
        />
      </section>

      {/* Collapsible Forms */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowAthleteForm(!showAthleteForm)}
          >
            <h3 className="text-lg font-semibold">Add Athlete</h3>
            <span className="text-slate-400 text-sm">{showAthleteForm ? "▲" : "▼"}</span>
          </button>
          {showAthleteForm && (
            <form className="mt-4 space-y-4" onSubmit={createAthlete}>
              <input className="input" name="name" placeholder="Name" required />
              <input className="input" name="position" placeholder="Position" />
              <input className="input" name="class_year" placeholder="Class Year" />
              <input className="input" name="state" placeholder="State" />
              <textarea className="input min-h-24" name="descriptor" placeholder="Physical descriptor for prompt assembly" required />
              <input className="input" name="style_preference" placeholder="Style preference (e.g. streetwear)" />
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input className="h-4 w-4" name="consent_signed" type="checkbox" value="true" />
                Signed consent &amp; usage release on file
              </label>
              <div className="space-y-1">
                <label className="text-xs text-muted" htmlFor="reference-photo">Reference Photo</label>
                <input id="reference-photo" className="input p-2" name="reference_photo" type="file" accept="image/*" />
              </div>
              <button className="button-secondary w-full" type="submit">Save Athlete</button>
            </form>
          )}
        </div>

        <div className="panel">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowTemplateForm(!showTemplateForm)}
          >
            <h3 className="text-lg font-semibold">Add Template</h3>
            <span className="text-slate-400 text-sm">{showTemplateForm ? "▲" : "▼"}</span>
          </button>
          {showTemplateForm && (
            <form className="mt-4 space-y-4" onSubmit={createTemplate}>
              <input className="input" name="category" placeholder="Category" required />
              <input className="input" name="variant_name" placeholder="Variant name" required />
              <textarea className="input min-h-20" name="action" placeholder="Action" required />
              <input className="input" name="location" placeholder="Location" required />
              <input className="input" name="wardrobe" placeholder="Wardrobe" required />
              <input className="input" name="lighting" placeholder="Lighting" required />
              <input className="input" name="camera_angle" placeholder="Camera angle" required />
              <input className="input" name="audio_track" placeholder="Audio track filename (optional)" />
              <select className="input" defaultValue="standard" name="content_tier" required>
                <option value="standard">standard</option>
                <option value="premium">premium</option>
                <option value="social">social</option>
              </select>
              <input className="input" name="platforms" placeholder="Platforms (e.g. TikTok, Reels, YT)" />
              <button className="button-secondary w-full" type="submit">Save Template</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
