"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

interface SettingsPanelProps {
  accessToken: string;
  onClose: () => void;
}

type TabId = "api-keys" | "pipeline" | "about";
type HealthStatus = "checking" | "success" | "failed" | "not_set";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "api-keys", label: "API Keys", icon: "🔑" },
  { id: "pipeline", label: "Pipeline", icon: "⚙️" },
  { id: "about", label: "About", icon: "ℹ️" }
];

interface ApiKeyConfig {
  key: string;
  healthKey: string;
  label: string;
  description: string;
  placeholder: string;
  tier?: string;
}

const API_KEYS: ApiKeyConfig[] = [
  { key: "runway_api_key", healthKey: "runway", label: "Runway Gen-4.5", description: "Video generation — all tiers currently route through Runway", placeholder: "key_...", tier: "All tiers" },
  { key: "anthropic_api_key", healthKey: "claude", label: "Claude AI (Anthropic)", description: "Prompt optimization, QC scoring, and AI assistant", placeholder: "sk-ant-..." },
  { key: "kling_api_key", healthKey: "kling", label: "Kling AI", description: "Standard tier engine — coming soon", placeholder: "kling_...", tier: "Coming Soon" },
  { key: "vidu_api_key", healthKey: "vidu", label: "Vidu Q3 Pro", description: "Social tier engine — coming soon", placeholder: "vidu_...", tier: "Coming Soon" },
  { key: "n8n_webhook_url", healthKey: "n8n", label: "n8n Webhook", description: "Automation — triggers on approved jobs for delivery pipeline", placeholder: "https://your-n8n.com/webhook/..." },
  { key: "creatomate_api_key", healthKey: "creatomate", label: "Creatomate", description: "Template-based video rendering engine for branded content", placeholder: "your_api_key_here", tier: "Template Videos" },
  { key: "elevenlabs_api_key", healthKey: "elevenlabs", label: "ElevenLabs", description: "Voice cloning and AI text-to-speech for athlete audio messages", placeholder: "your_api_key_here", tier: "Audio" }
];

const ApiKeyField = ({
  config, value, onChange, health, healthMsg, visibleKeys, onToggleVisible
}: {
  config: ApiKeyConfig;
  value: string;
  onChange: (key: string, val: string) => void;
  health: HealthStatus;
  healthMsg: string;
  visibleKeys: Set<string>;
  onToggleVisible: (key: string) => void;
}) => {
  const visible = visibleKeys.has(config.key);
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-neutral-900/50 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${
            health === "success" ? "bg-green-accent" :
            health === "failed" ? "bg-red-500" :
            health === "checking" ? "bg-amber-accent animate-pulse" :
            "bg-neutral-600"
          }`} />
          <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor={config.key}>{config.label}</label>
          {config.tier && (
            <span className={`rounded px-2 py-0.5 text-[10px] ${
              config.tier === "Coming Soon" ? "bg-blue-accent/20 text-blue-accent" : "bg-neutral-800 text-slate-400"
            }`}>{config.tier}</span>
          )}
        </div>
        <span className={`text-[10px] ${
          health === "success" ? "text-green-accent" :
          health === "failed" ? "text-red-500" :
          health === "checking" ? "text-amber-accent" :
          "text-muted"
        }`}>
          {health === "success" ? "Connected" : health === "failed" ? "Failed" : health === "checking" ? "Checking..." : value ? "Saved" : "Not set"}
        </span>
      </div>
      <p className="text-xs text-slate-500 pl-5">{config.description}</p>
      {health === "failed" && healthMsg && <p className="text-[11px] text-red-400 pl-5">{healthMsg}</p>}
      <div className="relative">
        <input
          id={config.key}
          className="input mt-1 pr-10 font-mono text-xs"
          type={visible ? "text" : "password"}
          placeholder={config.placeholder}
          value={value}
          onChange={(e) => onChange(config.key, e.target.value)}
        />
        <button
          type="button"
          onClick={() => onToggleVisible(config.key)}
          className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-500 hover:text-slate-300 transition"
          title={visible ? "Hide" : "Reveal"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export const SettingsPanel = ({ accessToken, onClose }: SettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("api-keys");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [health, setHealth] = useState<Record<string, HealthStatus>>({});
  const [healthMsgs, setHealthMsgs] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.ok) {
          const payload = await res.json();
          if (payload.data) {
            const m: Record<string, string> = {};
            for (const item of payload.data) m[item.key] = item.value;
            setValues(m);
          }
        }
      } catch { /* ignore */ }
    };
    void load();
    void runHealthChecks();
  }, [accessToken]);

  const runHealthChecks = async () => {
    setHealth({ runway: "checking", claude: "checking", kling: "checking", vidu: "checking", n8n: "checking" });
    try {
      const res = await fetch("/api/health", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        const h: Record<string, HealthStatus> = {};
        const m: Record<string, string> = {};
        for (const key of ["runway", "claude", "kling", "vidu", "n8n"]) {
          h[key] = (data[key]?.status as HealthStatus) ?? "not_set";
          m[key] = data[key]?.message ?? "";
        }
        setHealth(h);
        setHealthMsgs(m);
      }
    } catch {
      setHealth({ runway: "failed", claude: "failed", kling: "failed", vidu: "failed", n8n: "failed" });
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ settings: values })
      });
      if (!res.ok) { const p = await res.json(); throw new Error(p.error ?? "Failed to save."); }
      setNotice("Settings saved.");
      setTimeout(() => setNotice(null), 3000);
      await runHealthChecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = (key: string) => {
    setVisibleKeys((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const connectedCount = API_KEYS.filter((k) => health[k.healthKey] === "success").length;

  return (
    <section className="panel space-y-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-xs text-muted">{connectedCount}/{API_KEYS.length} services connected</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={runHealthChecks} className="rounded-lg p-2 text-slate-400 hover:bg-neutral-800 hover:text-white transition" title="Test all keys">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-2 text-slate-400 transition hover:bg-neutral-800 hover:text-slate-200"
            onClick={onClose} type="button" aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex border-b border-neutral-800">
        {TABS.map((tab) => (
          <button key={tab.id} type="button"
            onClick={() => { setActiveTab(tab.id); setError(null); setNotice(null); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
              activeTab === tab.id ? "border-b-2 border-accent text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="px-6 py-5">
        {activeTab === "api-keys" && (
          <div className="space-y-3">
            <p className="text-xs text-muted mb-3">Configure your AI video generation engines and automation services.</p>
            {API_KEYS.map((config) => (
              <ApiKeyField
                key={config.key}
                config={config}
                value={values[config.key] ?? ""}
                onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
                health={health[config.healthKey] ?? "not_set"}
                healthMsg={healthMsgs[config.healthKey] ?? ""}
                visibleKeys={visibleKeys}
                onToggleVisible={toggleVisible}
              />
            ))}
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-5">
            <p className="text-xs text-muted mb-2">Control face-scoring thresholds and retry behavior.</p>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-5">
              <h4 className="text-sm font-semibold text-slate-200">Face Score Routing</h4>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-400" htmlFor="auto_approve_threshold">Auto-approve threshold</label>
                  <div className="flex items-center gap-3">
                    <input id="auto_approve_threshold" className="input max-w-[100px] text-center text-lg font-semibold" type="number" min="0" max="100"
                      value={values["auto_approve_threshold"] ?? "90"}
                      onChange={(e) => setValues((prev) => ({ ...prev, auto_approve_threshold: e.target.value }))} />
                    <span className="text-xs text-slate-500">Score above → auto-approved</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-slate-400" htmlFor="review_threshold">Review threshold</label>
                  <div className="flex items-center gap-3">
                    <input id="review_threshold" className="input max-w-[100px] text-center text-lg font-semibold" type="number" min="0" max="100"
                      value={values["review_threshold"] ?? "85"}
                      onChange={(e) => setValues((prev) => ({ ...prev, review_threshold: e.target.value }))} />
                    <span className="text-xs text-slate-500">Score above → needs review</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Generation Retries</h4>
              <div className="flex items-center gap-3">
                <input id="max_retries" className="input max-w-[80px] text-center text-lg font-semibold" type="number" min="0" max="10"
                  value={values["max_retries"] ?? "2"}
                  onChange={(e) => setValues((prev) => ({ ...prev, max_retries: e.target.value }))} />
                <span className="text-xs text-slate-500">Max retries before rejection</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">AiC Content Studio</h4>
              <p className="text-xs text-slate-400">Fully automated AI lifestyle video production for Athletes in Control.</p>
              <div className="grid gap-2 text-xs text-slate-500">
                {[
                  ["Version", "V5 (Merged Final)"],
                  ["Pipeline", "Runway Gen-4.5 (all tiers)"],
                  ["Templates", "15 categories × 3 variants"],
                  ["QC", "Claude AI scoring + two-threshold routing"],
                  ["Orchestration", "Claude AI + n8n + Runway"]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-neutral-800 pb-2">
                    <span>{k}</span><span className="text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== "about" && (
          <div className="mt-6 space-y-3">
            {error && <div className="rounded-lg bg-rose-900/30 border border-rose-800 px-4 py-2 text-sm text-rose-300">{error}</div>}
            {notice && <div className="rounded-lg bg-emerald-900/30 border border-emerald-800 px-4 py-2 text-sm text-emerald-300">{notice}</div>}
            <button className="button-primary w-full py-2.5" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
};
