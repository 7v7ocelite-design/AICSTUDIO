"use client";

import { FormEvent, useEffect, useState } from "react";

interface SettingsPanelProps {
  accessToken: string;
  onClose: () => void;
}

interface ApiKeyConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    key: "kling_api_key",
    label: "Kling AI",
    description: "Video generation engine — primary provider for AI lifestyle videos",
    placeholder: "Enter Kling API key..."
  },
  {
    key: "runway_api_key",
    label: "Runway ML",
    description: "Video generation engine — alternative/backup provider",
    placeholder: "Enter Runway API key..."
  },
  {
    key: "vidu_api_key",
    label: "Vidu AI",
    description: "Video generation engine — third provider option",
    placeholder: "Enter Vidu API key..."
  },
  {
    key: "anthropic_api_key",
    label: "Claude AI (Anthropic)",
    description: "Prompt validation — reviews and optimizes prompts before generation",
    placeholder: "Enter Anthropic API key (sk-ant-...)..."
  },
  {
    key: "n8n_webhook_url",
    label: "n8n Webhook URL",
    description: "Automation workflow — receives approved video jobs for downstream processing",
    placeholder: "https://your-n8n-instance.com/webhook/..."
  }
];

export const SettingsPanel = ({ accessToken, onClose }: SettingsPanelProps) => {
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
        // Settings might not exist yet — that's fine
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">API Configuration</h2>
          <p className="mt-1 text-sm text-muted">
            Enter your API keys for each service. Keys are stored securely in the database.
          </p>
        </div>
        <button className="button-secondary" onClick={onClose} type="button">
          Close
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {API_KEYS.map((config) => (
          <div key={config.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200" htmlFor={config.key}>
                {config.label}
              </label>
              {values[config.key] && (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-200">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{config.description}</p>
            <input
              id={config.key}
              className="input"
              type="password"
              placeholder={config.placeholder}
              value={values[config.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [config.key]: e.target.value }))}
            />
          </div>
        ))}

        <div className="border-t border-neutral-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Pipeline Thresholds</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted" htmlFor="auto_approve_threshold">Auto-approve score</label>
              <input
                id="auto_approve_threshold"
                className="input"
                type="number"
                min="0"
                max="100"
                value={values["auto_approve_threshold"] ?? "90"}
                onChange={(e) => setValues((prev) => ({ ...prev, auto_approve_threshold: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted" htmlFor="review_threshold">Review threshold</label>
              <input
                id="review_threshold"
                className="input"
                type="number"
                min="0"
                max="100"
                value={values["review_threshold"] ?? "85"}
                onChange={(e) => setValues((prev) => ({ ...prev, review_threshold: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted" htmlFor="max_retries">Max retries</label>
              <input
                id="max_retries"
                className="input"
                type="number"
                min="0"
                max="10"
                value={values["max_retries"] ?? "2"}
                onChange={(e) => setValues((prev) => ({ ...prev, max_retries: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}

        <button className="button-primary w-full py-3" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </form>
    </section>
  );
};
