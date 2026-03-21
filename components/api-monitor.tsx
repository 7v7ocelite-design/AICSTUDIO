"use client";

import { PanelRightClose } from "lucide-react";

import type { Job } from "@/lib/types";

interface ApiMonitorProps {
  settings: Record<string, string>;
  jobs: Job[];
  onClose: () => void;
}

const SERVICE_MAP = [
  { key: "runway_api_key", label: "Runway Gen-4.5", tier: "All tiers", role: "Video engine (primary)", comingSoon: false },
  { key: "kling_api_key", label: "Kling AI", tier: "Standard", role: "Video engine", comingSoon: true },
  { key: "vidu_api_key", label: "Vidu Q3 Pro", tier: "Social", role: "Video engine", comingSoon: true },
  { key: "anthropic_api_key", label: "Claude AI", tier: null, role: "QC scoring", comingSoon: false },
  { key: "n8n_webhook_url", label: "n8n Webhook", tier: null, role: "Delivery", comingSoon: false }
];

const formatTime = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateString));

export const ApiMonitor = ({ settings, jobs, onClose }: ApiMonitorProps) => {
  const recentActivity = jobs.slice(0, 8);

  return (
    <aside className="flex w-[300px] flex-col border-l border-[var(--border-subtle)] bg-sidebar transition-all duration-200">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-4">
        <h3 className="text-sm font-semibold">API Monitor</h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-secondary hover:text-white">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Services */}
        <div className="space-y-1 px-4 py-3">
          {SERVICE_MAP.map((svc) => {
            const connected = Boolean(settings[svc.key]);
            const dotColor = svc.comingSoon ? "bg-blue-accent" : connected ? "bg-green-accent" : "bg-neutral-600";
            return (
              <div key={svc.key} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{svc.label}</p>
                  <p className="text-[10px] text-muted">{svc.role}</p>
                </div>
                <div className="text-right">
                  {svc.tier && <p className="text-[10px] text-secondary">{svc.tier}</p>}
                  {svc.comingSoon ? (
                    <p className="text-[10px] text-blue-accent">Coming Soon</p>
                  ) : (
                    <p className={`text-[10px] ${connected ? "text-green-accent" : "text-muted"}`}>
                      {connected ? "Connected" : "Not set"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline Config */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold text-secondary">Pipeline Config</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Auto-approve</span>
              <span className="text-[var(--text-primary)]">{settings.auto_approve_threshold ?? "90"}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Review</span>
              <span className="text-[var(--text-primary)]">{settings.review_threshold ?? "85"}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Max retries</span>
              <span className="text-[var(--text-primary)]">{settings.max_retries ?? "2"}</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold text-secondary">Activity Log</h4>
          <div className="space-y-1">
            {recentActivity.map((job) => (
              <div key={job.id} className="flex items-center gap-2 text-[11px]">
                <span className="flex-shrink-0 text-muted">{formatTime(job.created_at)}</span>
                <span className="truncate text-secondary">
                  {job.status === "approved" ? "✅" : job.status === "rejected" ? "❌" : job.status === "needs_review" ? "⚠️" : "🔄"}{" "}
                  {job.athlete?.name ?? "Job"} · {job.template?.category ?? ""}
                </span>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-[11px] text-muted">No activity yet.</p>}
          </div>
        </div>
      </div>
    </aside>
  );
};
