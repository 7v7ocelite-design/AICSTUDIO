"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<{
    totalVideos: number;
    totalAthletes: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ])
      .then(([s, st]) => {
        setSettings(s);
        setStats({
          totalVideos: st.videosGenerated?.total || 0,
          totalAthletes: st.totalAthletes || 0,
        });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-accent" size={32} />
      </div>
    );
  }

  const apiKeys = [
    { key: "anthropic_api_key", label: "Anthropic API Key" },
    { key: "kling_api_key", label: "Kling API Key" },
    { key: "runway_api_key", label: "Runway API Key" },
    { key: "vidu_api_key", label: "Vidu API Key" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* API Keys */}
        <section className="bg-brand-card rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <div className="space-y-4">
            {apiKeys.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showKeys[key] ? "text" : "password"}
                    value={settings[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-brand-accent font-mono"
                  />
                  <button
                    onClick={() => toggleShow(key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    {showKeys[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quality Thresholds */}
        <section className="bg-brand-card rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Quality Thresholds</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Auto-Approve Threshold
              </label>
              <input
                type="number"
                value={settings.auto_approve_threshold || "90"}
                onChange={(e) => update("auto_approve_threshold", e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Score ≥ this = auto-approved
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Review Threshold
              </label>
              <input
                type="number"
                value={settings.review_threshold || "85"}
                onChange={(e) => update("review_threshold", e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Score ≥ this = needs review
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={settings.max_retries || "2"}
                onChange={(e) => update("max_retries", e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Retry count if score is too low
              </p>
            </div>
          </div>
        </section>

        {/* Automation */}
        <section className="bg-brand-card rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">Automation</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              n8n Webhook URL
            </label>
            <input
              type="text"
              value={settings.n8n_webhook_url || ""}
              onChange={(e) => update("n8n_webhook_url", e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Receives notifications on video completion
            </p>
          </div>
        </section>

        {/* About */}
        <section className="bg-brand-card rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Version</p>
              <p className="font-medium">0.1.0</p>
            </div>
            <div>
              <p className="text-gray-400">Total Videos</p>
              <p className="font-medium">{stats?.totalVideos || 0}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Athletes</p>
              <p className="font-medium">{stats?.totalAthletes || 0}</p>
            </div>
          </div>
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-accent hover:bg-brand-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
