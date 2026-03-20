"use client";

import { FormEvent, useEffect, useState } from "react";

interface SettingsPanelProps {
  accessToken: string;
  onClose: () => void;
}

type TabId = "api-keys" | "pipeline" | "about";

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: "api-keys", label: "API Keys", icon: "🔑" },
  { id: "pipeline", label: "Pipeline", icon: "⚙️" },
  { id: "about", label: "About", icon: "ℹ️" }
];

interface ApiKeyConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  tier?: string;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    key: "kling_api_key",
    label: "Kling AI",
    description: "Primary video engine — 80% of standard tier production",
    placeholder: "Enter Kling API key...",
    tier: "Standard (80%)"
  },
  {
    key: "runway_api_key",
    label: "Runway Gen-4.5",
    description: "Premium tier — sponsor/branded content requiring max fidelity",
    placeholder: "Enter Runway API key...",
    tier: "Premium (10%)"
  },
  {
    key: "vidu_api_key",
    label: "Vidu Q3 Pro",
    description: "Social tier — fastest generation for same-day trend content",
    placeholder: "Enter Vidu API key...",
    tier: "Social (10%)"
  },
  {
    key: "anthropic_api_key",
    label: "Claude AI (Anthropic)",
    description: "Prompt validation and quality orchestration layer",
    placeholder: "sk-ant-..."
  },
  {
    key: "n8n_webhook_url",
    label: "n8n Webhook",
    description: "Automation — triggers on approved jobs for delivery pipeline",
    placeholder: "https://your-n8n.com/webhook/..."
  }
];

export const SettingsPanel = ({ accessToken, onClose }: SettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("api-keys");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload.data) {
            const settingsMap: Record<string, string> = {};
            for (const item of payload.data) {
              settingsMap[item.key] = item.value;
            }
            setValues(settingsMap);
          }
        }
      } catch {
        // Settings might not exist yet
      }
    };
    void loadSettings();
  }, [accessToken]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ settings: values })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Failed to save settings.");
      }
      setNotice("Settings saved successfully.");
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const connectedCount = API_KEYS.filter((k) => values[k.key]).length;

  return (
    <section className="panel space-y-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-xs text-muted">{connectedCount}/{API_KEYS.length} services connected</p>
        </div>
        <button
          className="rounded-lg p-2 text-slate-400 transition hover:bg-neutral-800 hover:text-slate-200"
          onClick={onClose}
          type="button"
          aria-label="Close settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-neutral-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setError(null); setNotice(null); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-accent text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSave} className="px-6 py-5">
        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <div className="space-y-4">
            <p className="text-xs text-muted mb-4">
              Configure your AI video generation engines and automation services.
            </p>
            {API_KEYS.map((config) => (
              <div
                key={config.key}
                className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${values[config.key] ? "bg-emerald-400" : "bg-neutral-600"}`} />
                    <label className="text-sm font-medium text-slate-200" htmlFor={config.key}>
                      {config.label}
                    </label>
                    {config.tier && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-slate-400">
                        {config.tier}
                      </span>
                    )}
                  </div>
                  {values[config.key] && (
                    <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] text-emerald-300">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 pl-5">{config.description}</p>
                <input
                  id={config.key}
                  className="input mt-1"
                  type="password"
                  placeholder={config.placeholder}
                  value={values[config.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pipeline Tab */}
        {activeTab === "pipeline" && (
          <div className="space-y-5">
            <p className="text-xs text-muted mb-2">
              Control face-scoring thresholds and retry behavior for the automated QC pipeline.
            </p>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-5">
              <h4 className="text-sm font-semibold text-slate-200">Face Score Routing</h4>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400" htmlFor="auto_approve_threshold">
                    Auto-approve threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="auto_approve_threshold"
                      className="input max-w-[100px] text-center text-lg font-semibold"
                      type="number"
                      min="0"
                      max="100"
                      value={values["auto_approve_threshold"] ?? "90"}
                      onChange={(e) => setValues((prev) => ({ ...prev, auto_approve_threshold: e.target.value }))}
                    />
                    <span className="text-xs text-slate-500">Score above this → auto-approved</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400" htmlFor="review_threshold">
                    Review threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="review_threshold"
                      className="input max-w-[100px] text-center text-lg font-semibold"
                      type="number"
                      min="0"
                      max="100"
                      value={values["review_threshold"] ?? "85"}
                      onChange={(e) => setValues((prev) => ({ ...prev, review_threshold: e.target.value }))}
                    />
                    <span className="text-xs text-slate-500">Score above this → needs human review</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">
                Below review threshold → auto-reject &amp; re-generate. Per V5 spec: 85% approve, 10-15% review, 5% reject.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Generation Retries</h4>
              <div className="flex items-center gap-3">
                <input
                  id="max_retries"
                  className="input max-w-[80px] text-center text-lg font-semibold"
                  type="number"
                  min="0"
                  max="10"
                  value={values["max_retries"] ?? "2"}
                  onChange={(e) => setValues((prev) => ({ ...prev, max_retries: e.target.value }))}
                />
                <span className="text-xs text-slate-500">Max retry attempts before permanent rejection</span>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">AiC Content Studio</h4>
              <p className="text-xs text-slate-400">
                Fully automated AI lifestyle video production dashboard for Athletes in Control.
              </p>
              <div className="grid gap-2 text-xs text-slate-500">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span>Version</span>
                  <span className="text-slate-300">V5 (Merged Final)</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span>Pipeline</span>
                  <span className="text-slate-300">3-engine (Kling / Runway / Vidu)</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span>Templates</span>
                  <span className="text-slate-300">15 categories × 3 variants</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span>QC</span>
                  <span className="text-slate-300">Two-threshold face scoring</span>
                </div>
                <div className="flex justify-between">
                  <span>Orchestration</span>
                  <span className="text-slate-300">Claude AI + n8n + ComfyUI</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-2">
              <h4 className="text-sm font-semibold text-slate-200">Stack Cost (per V5)</h4>
              <p className="text-xs text-slate-500">
                ~$105–140/mo stack + ~$4–8/video generation. At 300 videos/mo and $75 sell price → ~89-94% gross margin.
              </p>
            </div>
          </div>
        )}

        {/* Footer — Save button + notices (shown on API Keys and Pipeline tabs) */}
        {activeTab !== "about" && (
          <div className="mt-6 space-y-3">
            {error && (
              <div className="rounded-lg bg-rose-900/30 border border-rose-800 px-4 py-2 text-sm text-rose-300">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 px-4 py-2 text-sm text-emerald-300">
                {notice}
              </div>
            )}
            <button className="button-primary w-full py-2.5" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
};
