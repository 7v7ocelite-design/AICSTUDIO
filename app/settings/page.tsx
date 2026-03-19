"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Setting } from "@/lib/types";

const defaults = {
  webhook_url: "",
  auto_approve_threshold: "90",
  review_threshold: "85",
  runway_api_key: "",
  kling_api_key: "",
  vidu_api_key: ""
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [formState, setFormState] = useState(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as { settings: Setting[] };
      const fetched = payload.settings ?? [];
      setSettings(fetched);

      const nextState = { ...defaults };
      fetched.forEach((setting) => {
        if (setting.key in nextState) {
          nextState[setting.key as keyof typeof defaults] = setting.value;
        }
      });
      setFormState(nextState);
    };

    void load();
  }, []);

  const existingIds = useMemo(() => {
    const map = new Map<string, string>();
    settings.forEach((setting) => map.set(setting.key, setting.id));
    return map;
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(formState).map(([key, value]) => ({
        id: existingIds.get(key),
        key,
        value
      }));

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      toast.success("Settings updated.");
    } catch {
      toast.error("Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage API keys, webhook callback, and confidence thresholds for automated approvals."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Model Providers & Automation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Runway API Key</label>
            <Input
              type="password"
              value={formState.runway_api_key}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, runway_api_key: event.target.value }))
              }
              placeholder="rw_..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Kling API Key</label>
            <Input
              type="password"
              value={formState.kling_api_key}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, kling_api_key: event.target.value }))
              }
              placeholder="kg_..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Vidu API Key</label>
            <Input
              type="password"
              value={formState.vidu_api_key}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, vidu_api_key: event.target.value }))
              }
              placeholder="vd_..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Webhook URL</label>
            <Input
              value={formState.webhook_url}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, webhook_url: event.target.value }))
              }
              placeholder="https://example.com/webhooks/aic"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Auto-approve threshold</label>
            <Input
              type="number"
              min={85}
              max={100}
              value={formState.auto_approve_threshold}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  auto_approve_threshold: event.target.value
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Needs-review threshold</label>
            <Input
              type="number"
              min={80}
              max={95}
              value={formState.review_threshold}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, review_threshold: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
