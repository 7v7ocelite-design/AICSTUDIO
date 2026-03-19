"use client";

import { Settings } from "@/lib/types";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type Totals = { athletes: number; jobs: number };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [totals, setTotals] = useState<Totals>({ athletes: 0, jobs: 0 });
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [settingsRes, statsRes] = await Promise.all([fetch("/api/settings"), fetch("/api/stats")]);
      const settingsJson = (await settingsRes.json()) as { settings: Settings };
      const statsJson = (await statsRes.json()) as { totals: Totals };
      setSettings(settingsJson.settings);
      setTotals(statsJson.totals);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-slate-400">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-400">Configure API keys, quality thresholds, and automation.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSave}>
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">API Keys</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs"
              onClick={() => setShowSecrets((prev) => !prev)}
            >
              {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
              {showSecrets ? "Hide" : "Show"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SecretInput
              label="Kling API Key"
              value={settings.kling_api_key}
              show={showSecrets}
              onChange={(value) => setSettings((prev) => (prev ? { ...prev, kling_api_key: value } : prev))}
            />
            <SecretInput
              label="Runway API Key"
              value={settings.runway_api_key}
              show={showSecrets}
              onChange={(value) => setSettings((prev) => (prev ? { ...prev, runway_api_key: value } : prev))}
            />
            <SecretInput
              label="Vidu API Key"
              value={settings.vidu_api_key}
              show={showSecrets}
              onChange={(value) => setSettings((prev) => (prev ? { ...prev, vidu_api_key: value } : prev))}
            />
            <SecretInput
              label="Anthropic API Key"
              value={settings.anthropic_api_key}
              show={showSecrets}
              onChange={(value) => setSettings((prev) => (prev ? { ...prev, anthropic_api_key: value } : prev))}
            />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Quality Thresholds</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <NumberInput
              label="Auto-Approve threshold"
              value={settings.auto_approve_threshold}
              onChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, auto_approve_threshold: value } : prev))
              }
            />
            <NumberInput
              label="Review threshold"
              value={settings.review_threshold}
              onChange={(value) => setSettings((prev) => (prev ? { ...prev, review_threshold: value } : prev))}
            />
            <NumberInput
              label="Max retries"
              value={String(settings.max_retries)}
              onChange={(value) =>
                setSettings((prev) => (prev ? { ...prev, max_retries: Number(value || 0) } : prev))
              }
            />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-lg font-semibold">Automation</h2>
          <label className="text-sm text-slate-300">n8n Webhook URL</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={settings.n8n_webhook_url}
            onChange={(event) =>
              setSettings((prev) => (prev ? { ...prev, n8n_webhook_url: event.target.value } : prev))
            }
          />
        </section>

        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">About</h2>
          <p className="text-sm text-slate-300">Version: 0.1.0</p>
          <p className="text-sm text-slate-300">Total videos generated: {totals.jobs}</p>
          <p className="text-sm text-slate-300">Total athletes: {totals.athletes}</p>
        </section>

        <button className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold">Save Settings</button>
      </form>
    </div>
  );
}

function SecretInput({
  label,
  value,
  show,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type={show ? "text" : "password"}
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900/70 p-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900/70 p-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
