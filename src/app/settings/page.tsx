"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import type { Settings } from "@/lib/types";
import { Save, Key, Gauge, Bell } from "lucide-react";
import { toast } from "sonner";

interface SettingsGroup {
  title: string;
  icon: typeof Key;
  keys: string[];
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "API Keys",
    icon: Key,
    keys: [
      "runway_api_key",
      "kling_api_key",
      "vidu_api_key",
      "claude_api_key",
    ],
  },
  {
    title: "Thresholds",
    icon: Gauge,
    keys: [
      "auto_approve_threshold",
      "review_threshold",
      "reject_threshold",
    ],
  },
  {
    title: "Webhooks",
    icon: Bell,
    keys: ["webhook_url", "webhook_secret"],
  },
];

const settingsDefaults: Record<string, { value: string; description: string }> = {
  runway_api_key: { value: "", description: "Runway Gen-4.5 API key for premium tier" },
  kling_api_key: { value: "", description: "Kling 3.0 API key for standard tier" },
  vidu_api_key: { value: "", description: "Vidu Q3 Pro API key for social tier" },
  claude_api_key: { value: "", description: "Claude AI API key for prompt validation" },
  auto_approve_threshold: { value: "90", description: "Face score threshold for auto-approval (≥)" },
  review_threshold: { value: "85", description: "Face score threshold for manual review (≥)" },
  reject_threshold: { value: "85", description: "Face score below this triggers retry/reject (<)" },
  webhook_url: { value: "", description: "Webhook URL for job notifications" },
  webhook_secret: { value: "", description: "Secret for webhook authentication" },
};

export default function SettingsPage() {
  const [, setSettings] = useState<Record<string, Settings>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, Settings> = {};
          const vals: Record<string, string> = {};
          for (const s of data.settings || []) {
            map[s.key] = s;
            vals[s.key] = s.value;
          }
          for (const [key, def] of Object.entries(settingsDefaults)) {
            if (!vals[key]) vals[key] = def.value;
          }
          setSettings(map);
          setFormValues(vals);
        } else {
          const vals: Record<string, string> = {};
          for (const [key, def] of Object.entries(settingsDefaults)) {
            vals[key] = def.value;
          }
          setFormValues(vals);
        }
      } catch {
        const vals: Record<string, string> = {};
        for (const [key, def] of Object.entries(settingsDefaults)) {
          vals[key] = def.value;
        }
        setFormValues(vals);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(formValues).map(([key, value]) => ({
        key,
        value,
        description: settingsDefaults[key]?.description || "",
      }));
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: entries }),
      });
      if (res.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function isApiKey(key: string) {
    return key.includes("api_key") || key.includes("secret");
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-400">
            Configure API keys, thresholds, and notifications
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {settingsGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.title}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-brand-accent/10 p-2">
                    <Icon className="h-5 w-5 text-brand-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {group.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {group.keys.map((key) => (
                    <div key={key}>
                      <Input
                        label={key
                          .split("_")
                          .map(
                            (w) => w.charAt(0).toUpperCase() + w.slice(1)
                          )
                          .join(" ")}
                        type={isApiKey(key) ? "password" : "text"}
                        placeholder={
                          settingsDefaults[key]?.description || key
                        }
                        value={formValues[key] || ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {settingsDefaults[key]?.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          <Card>
            <h2 className="mb-2 text-lg font-semibold text-white">
              Face Score Routing
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              How generated videos are automatically routed based on face fidelity scores
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    Auto-Approve
                  </p>
                  <p className="text-xs text-gray-500">
                    Score ≥ {formValues.auto_approve_threshold || "90"}
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-400">
                  ≥{formValues.auto_approve_threshold || "90"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-orange-500/5 border border-orange-500/10 p-4">
                <div>
                  <p className="text-sm font-medium text-orange-400">
                    Needs Review
                  </p>
                  <p className="text-xs text-gray-500">
                    Score {formValues.review_threshold || "85"}-
                    {Number(formValues.auto_approve_threshold || "90") - 1}
                  </p>
                </div>
                <span className="text-lg font-bold text-orange-400">
                  {formValues.review_threshold || "85"}-
                  {Number(formValues.auto_approve_threshold || "90") - 1}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-red-500/5 border border-red-500/10 p-4">
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Retry / Reject
                  </p>
                  <p className="text-xs text-gray-500">
                    Score &lt; {formValues.reject_threshold || "85"}
                  </p>
                </div>
                <span className="text-lg font-bold text-red-400">
                  &lt;{formValues.reject_threshold || "85"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
