"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";

import type { Athlete, DashboardBootstrap, Job, Template } from "@/lib/types";
import { SettingsPanel } from "@/components/settings-panel";

interface DashboardProps {
  accessToken: string;
  onSignOut: () => Promise<unknown>;
}

const statusClassMap: Record<string, string> = {
  queued: "bg-slate-700 text-slate-200",
  generating: "bg-blue-900 text-blue-200",
  scoring: "bg-amber-900 text-amber-200",
  needs_review: "bg-purple-900 text-purple-200",
  approved: "bg-emerald-900 text-emerald-200",
  rejected: "bg-rose-900 text-rose-200"
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));

export const Dashboard = ({ accessToken, onSignOut }: DashboardProps) => {
  const [data, setData] = useState<DashboardBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  const runGeneration = async () => {
    if (!selectedAthlete || !selectedTemplate) {
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
        body: JSON.stringify({
          athleteId: selectedAthlete,
          templateId: selectedTemplate
        })
      });

      const payload = (await response.json()) as { data?: Job; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to generate video.");
      }

      setData((current) =>
        current
          ? {
              ...current,
              jobs: [payload.data as Job, ...current.jobs]
            }
          : current
      );
      setNotice(`Generation completed: ${payload.data.status}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
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
          ? {
              ...current,
              athletes: [payload.data as Athlete, ...current.athletes]
            }
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
          ? {
              ...current,
              templates: [payload.data as Template, ...current.templates]
            }
          : current
      );
      setSelectedTemplate(payload.data.id);
      setNotice("Template created.");
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Template creation failed.");
    }
  };

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
        <div className="flex items-center gap-3">
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
          <button className="button-secondary" onClick={() => void onSignOut()} type="button">
            Sign Out
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel
          accessToken={accessToken}
          onClose={() => setShowSettings(false)}
        />
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel space-y-5">
          <h2 className="text-lg font-semibold">One-Click Video Generation</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="athlete-select">
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
              <label className="text-sm text-slate-300" htmlFor="template-select">
                Template
              </label>
              <select
                id="template-select"
                className="input"
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                <option value="">Select template</option>
                {data.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.category} · {template.variant_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="button-primary w-full py-3 text-base"
            disabled={isGenerating || consentMissing}
            onClick={runGeneration}
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

        <div className="panel space-y-4">
          <h2 className="text-lg font-semibold">Recent Jobs</h2>
          <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
            {data.jobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {job.athlete?.name ?? "Unknown athlete"} · {job.template?.variant_name ?? "Template"}
                    </p>
                    <p className="mt-1 text-xs text-muted">{formatDate(job.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${statusClassMap[job.status] ?? "bg-slate-700"}`}>
                    {job.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">Engine: {job.engine_used ?? "n/a"}</p>
                <p className="text-xs text-muted">Face score: {job.face_score?.toFixed(1) ?? "n/a"}</p>
                {job.video_url ? (
                  <video className="mt-3 w-full rounded-md border border-slate-700" controls src={job.video_url} />
                ) : null}
              </article>
            ))}
            {data.jobs.length === 0 ? <p className="text-sm text-muted">No jobs yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="panel space-y-4" onSubmit={createAthlete}>
          <h3 className="text-lg font-semibold">Add Athlete</h3>
          <input className="input" name="name" placeholder="Name" required />
          <input className="input" name="position" placeholder="Position" />
          <input className="input" name="class_year" placeholder="Class Year" />
          <input className="input" name="state" placeholder="State" />
          <textarea
            className="input min-h-24"
            name="descriptor"
            placeholder="Physical descriptor for prompt assembly"
            required
          />
          <input className="input" name="style_preference" placeholder="Style preference (e.g. streetwear)" />
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input className="h-4 w-4" name="consent_signed" type="checkbox" value="true" />
            Signed consent &amp; usage release on file
          </label>
          <div className="space-y-1">
            <label className="text-xs text-muted" htmlFor="reference-photo">
              Reference Photo
            </label>
            <input id="reference-photo" className="input p-2" name="reference_photo" type="file" accept="image/*" />
          </div>
          <button className="button-secondary w-full" type="submit">
            Save Athlete
          </button>
        </form>

        <form className="panel space-y-4" onSubmit={createTemplate}>
          <h3 className="text-lg font-semibold">Add Template</h3>
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
          <button className="button-secondary w-full" type="submit">
            Save Template
          </button>
        </form>
      </section>
    </main>
  );
};
