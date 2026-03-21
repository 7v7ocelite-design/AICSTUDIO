"use client";

import { useEffect, useState } from "react";
import { PanelRightClose, RefreshCw } from "lucide-react";

import type { Job } from "@/lib/types";

type HealthStatus = "checking" | "success" | "failed" | "not_set";

interface ApiMonitorProps {
  settings: Record<string, string>;
  jobs: Job[];
  accessToken: string;
  onClose: () => void;
}

const formatTime = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));

const SERVICE_DEFS = [
  { healthKey: "runway", label: "Runway Gen-4.5", role: "Video generation (all tiers)" },
  { healthKey: "claude", label: "Claude AI", role: "Prompt optimizer + QC + assistant" },
  { healthKey: "kling", label: "Kling AI", role: "Standard tier — coming soon" },
  { healthKey: "vidu", label: "Vidu Q3 Pro", role: "Social tier — coming soon" },
  { healthKey: "n8n", label: "n8n Webhook", role: "Delivery automation" }
];

export const ApiMonitor = ({ settings, jobs, accessToken, onClose }: ApiMonitorProps) => {
  const [health, setHealth] = useState<Record<string, HealthStatus>>({});
  const [healthMsgs, setHealthMsgs] = useState<Record<string, string>>({});
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const runChecks = async () => {
    const checking: Record<string, HealthStatus> = {};
    for (const s of SERVICE_DEFS) checking[s.healthKey] = "checking";
    setHealth(checking);
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
        setLastChecked(data.checked_at);
      }
    } catch {
      const failed: Record<string, HealthStatus> = {};
      for (const s of SERVICE_DEFS) failed[s.healthKey] = "failed";
      setHealth(failed);
    }
  };

  useEffect(() => { void runChecks(); }, []);

  const recentActivity = jobs.slice(0, 8);

  return (
    <aside className="flex w-[300px] flex-col border-l border-[var(--border-subtle)] bg-sidebar transition-all duration-200">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-4">
        <h3 className="text-sm font-semibold">API Monitor</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={runChecks} className="rounded p-1 text-secondary hover:text-white" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onClose} className="rounded p-1 text-secondary hover:text-white">
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 px-4 py-3">
          {SERVICE_DEFS.map((svc) => {
            const st = health[svc.healthKey] ?? "not_set";
            const msg = healthMsgs[svc.healthKey] ?? "";
            return (
              <div key={svc.healthKey} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  st === "success" ? "bg-green-accent" :
                  st === "failed" ? "bg-red-500" :
                  st === "checking" ? "bg-amber-accent animate-pulse" :
                  "bg-neutral-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{svc.label}</p>
                  <p className="text-[10px] text-muted">{svc.role}</p>
                </div>
                <span className={`text-[10px] ${
                  st === "success" ? "text-green-accent" :
                  st === "failed" ? "text-red-500" :
                  st === "checking" ? "text-amber-accent" :
                  "text-muted"
                }`}>
                  {st === "success" ? "Live" : st === "failed" ? "Failed" : st === "checking" ? "Testing..." : "Not set"}
                </span>
              </div>
            );
          })}
          {lastChecked && (
            <p className="text-[9px] text-muted text-right mt-1">Checked: {new Date(lastChecked).toLocaleTimeString()}</p>
          )}
        </div>

        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold text-secondary">Pipeline Config</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted">Auto-approve</span><span>{settings.auto_approve_threshold ?? "90"}%</span></div>
            <div className="flex justify-between"><span className="text-muted">Review</span><span>{settings.review_threshold ?? "85"}%</span></div>
            <div className="flex justify-between"><span className="text-muted">Max retries</span><span>{settings.max_retries ?? "2"}</span></div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold text-secondary">Activity Log</h4>
          <div className="space-y-1">
            {recentActivity.map((job) => {
              const isLive = job.engine_used?.includes("(live)");
              return (
                <div key={job.id} className={`flex items-center gap-2 text-[11px] border-l-2 pl-2 ${
                  isLive ? "border-green-accent" : job.status === "rejected" ? "border-red-500" : "border-neutral-700"
                }`}>
                  <span className="flex-shrink-0 text-muted">{formatTime(job.created_at)}</span>
                  <span className="truncate text-secondary">
                    {job.status === "approved" ? "✅" : job.status === "rejected" ? "❌" : job.status === "needs_review" ? "⚠️" : "🔄"}{" "}
                    {job.athlete?.name ?? "Job"} · {job.template?.category ?? ""}
                  </span>
                </div>
              );
            })}
            {recentActivity.length === 0 && <p className="text-[11px] text-muted">No activity yet.</p>}
          </div>
        </div>
      </div>
    </aside>
  );
};
