"use client";

import type { Job } from "@/lib/types";

interface AnalyticsViewProps {
  jobs: Job[];
}

export const AnalyticsView = ({ jobs }: AnalyticsViewProps) => {
  const approved = jobs.filter((j) => j.status === "approved").length;
  const review = jobs.filter((j) => j.status === "needs_review").length;
  const rejected = jobs.filter((j) => j.status === "rejected").length;
  const total = jobs.length;
  const avgScore = total > 0
    ? (jobs.reduce((acc, j) => acc + (j.face_score ?? 0), 0) / total).toFixed(1)
    : "—";
  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(0) : "—";

  const engineCounts: Record<string, number> = {};
  for (const j of jobs) {
    const e = j.engine_used ?? "unknown";
    engineCounts[e] = (engineCounts[e] ?? 0) + 1;
  }

  const cards = [
    { label: "Total Jobs", value: total, color: "text-white" },
    { label: "Approved", value: approved, color: "text-green-accent" },
    { label: "Needs Review", value: review, color: "text-amber-accent" },
    { label: "Rejected", value: rejected, color: "text-red-500" },
    { label: "Avg Face Score", value: `${avgScore}%`, color: "text-white" },
    { label: "Approval Rate", value: `${approvalRate}%`, color: "text-green-accent" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-secondary mt-1">Production metrics and pipeline performance.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-center">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-secondary mb-3">Engine Usage</h3>
          {Object.entries(engineCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(engineCounts).sort(([, a], [, b]) => b - a).map(([engine, count]) => (
                <div key={engine} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-secondary capitalize">{engine}</span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No data yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-secondary mb-3">Cost Estimate</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Videos generated</span>
              <span className="text-[var(--text-primary)]">{total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Est. cost per video</span>
              <span className="text-[var(--text-primary)]">$4–8</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
              <span className="text-muted">Est. total spend</span>
              <span className="font-semibold text-[var(--text-primary)]">${(total * 6).toFixed(0)}</span>
            </div>
            <p className="text-[10px] text-muted mt-2">At $75 sell price → ~{total > 0 ? "89–94" : "—"}% gross margin</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-center">
        <p className="text-sm text-muted">More detailed analytics coming soon — content calendar, top templates, per-athlete ROI.</p>
      </div>
    </div>
  );
};
