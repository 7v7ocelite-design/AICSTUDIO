"use client";

import { useState } from "react";

import type { Job } from "@/lib/types";
import { ProgressRing } from "@/components/progress-ring";
import { useJobPolling } from "@/hooks/use-job-polling";

type QueueTab = "all" | "approval" | "review";

interface JobQueuesProps {
  jobs: Job[];
  settings: Record<string, string>;
  accessToken: string;
  onJobUpdate: (updatedJob: Job) => void;
  onJobsCreated: (newJobs: Job[]) => void;
  onRegenerate: (athleteId: string, templateId: string) => void;
  initialTab?: QueueTab;
}

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));

const scoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-700 text-slate-200";
  if (score >= 90) return "bg-emerald-900 text-emerald-200";
  if (score >= 85) return "bg-amber-900 text-amber-200";
  return "bg-rose-900 text-rose-200";
};

const statusClass: Record<string, string> = {
  queued: "bg-slate-700 text-slate-200",
  processing: "bg-blue-900 text-blue-200",
  generating: "bg-blue-900 text-blue-200",
  scoring: "bg-amber-900 text-amber-200",
  needs_review: "bg-purple-900 text-purple-200",
  approved: "bg-emerald-900 text-emerald-200",
  rejected: "bg-rose-900 text-rose-200"
};

const borderForJob = (job: Job): string => {
  if (job.status === "approved") return "border-l-4 border-l-emerald-500";
  if (job.status === "rejected") return "border-l-4 border-l-rose-500";
  if (job.status === "needs_review") return "border-l-4 border-l-amber-500";
  if ((job.face_score ?? 0) >= 90) return "border-l-4 border-l-emerald-500";
  if ((job.face_score ?? 0) >= 85) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-rose-500";
};

export const JobQueues = ({
  jobs,
  settings,
  accessToken,
  onJobUpdate,
  onJobsCreated,
  onRegenerate,
  initialTab
}: JobQueuesProps) => {
  const [activeTab, setActiveTab] = useState<QueueTab>(initialTab ?? "all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [creatingMock, setCreatingMock] = useState(false);
  const { jobProgress } = useJobPolling({
    jobs,
    accessToken,
    onJobUpdate
  });

  const autoApprove = Number(settings.auto_approve_threshold) || 90;
  const reviewThreshold = Number(settings.review_threshold) || 85;

  const pendingStatuses = new Set(["queued", "generating", "scoring", "needs_review"]);

  const approvalQueue = jobs.filter(
    (j) =>
      (j.face_score ?? 0) >= autoApprove &&
      pendingStatuses.has(j.status)
  );

  const reviewQueue = jobs.filter(
    (j) =>
      (j.face_score ?? 0) >= reviewThreshold &&
      (j.face_score ?? 0) < autoApprove &&
      pendingStatuses.has(j.status)
  );

  const patchJob = async (jobId: string, status: "approved" | "rejected") => {
    setActionInProgress(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      const payload = await res.json();
      if (res.ok && payload.data) {
        onJobUpdate(payload.data as Job);
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const bulkApprove = async () => {
    for (const job of approvalQueue) {
      await patchJob(job.id, "approved");
    }
  };

  const createMockJobs = async () => {
    setCreatingMock(true);
    try {
      const res = await fetch("/api/jobs/mock", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = await res.json();
      if (res.ok && payload.data) {
        onJobsCreated(payload.data as Job[]);
      }
    } finally {
      setCreatingMock(false);
    }
  };

  const visibleJobs =
    activeTab === "approval"
      ? approvalQueue
      : activeTab === "review"
        ? reviewQueue
        : jobs;

  const tabs: Array<{ id: QueueTab; label: string; count: number }> = [
    { id: "all", label: "All Jobs", count: jobs.length },
    { id: "approval", label: "Approval Queue", count: approvalQueue.length },
    { id: "review", label: "Review Queue", count: reviewQueue.length }
  ];

  const processingStatusText = (jobId: string): string | null => {
    const state = jobProgress[jobId];
    if (!state) return null;

    const pct = `${Math.round(state.progress)}%`;
    const status = state.runwayStatus;

    if (status) {
      return `Generating with Runway... (${state.elapsed}s elapsed · ${status} · ${pct})`;
    }

    return `Generating with Runway... (${state.elapsed}s elapsed · ${pct})`;
  };

  return (
    <div className="panel space-y-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "bg-neutral-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab.id === "approval" ? "bg-emerald-900 text-emerald-200" :
                  tab.id === "review" ? "bg-amber-900 text-amber-200" :
                  "bg-neutral-600 text-slate-200"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[10px] font-medium text-slate-400 transition hover:border-neutral-500 hover:text-slate-200"
          onClick={createMockJobs}
          disabled={creatingMock}
        >
          {creatingMock ? "Creating…" : "+ Mock Jobs"}
        </button>
      </div>

      {/* Bulk approve for approval tab */}
      {activeTab === "approval" && approvalQueue.length > 0 && (
        <button
          type="button"
          className="w-full rounded-lg bg-emerald-800 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700"
          onClick={bulkApprove}
        >
          Bulk Approve All ({approvalQueue.length})
        </button>
      )}

      {/* Job list */}
      <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
        {visibleJobs.map((job) => (
          <article
            key={job.id}
            className={`rounded-lg border border-slate-700 bg-slate-950 p-3 ${borderForJob(job)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {job.athlete?.name ?? "Unknown"} · {job.template?.category ?? ""} – {job.template?.variant_name ?? "Template"}
                </p>
                <p className="mt-0.5 text-xs text-muted">{formatDate(job.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {job.face_score !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreColor(job.face_score)}`}>
                    {job.face_score.toFixed(1)}
                  </span>
                )}
                {job.status === "processing" ? (
                  <ProgressRing
                    progress={jobProgress[job.id]?.progress ?? 0}
                    elapsedSeconds={jobProgress[job.id]?.elapsed ?? 0}
                    size={44}
                    strokeWidth={3}
                  />
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusClass[job.status] ?? "bg-slate-700"}`}>
                    {job.status}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs">
              <span className="text-muted">Engine: </span>
              <span className={job.engine_used?.includes("(live)") ? "text-green-accent font-medium" : "text-muted"}>
                {job.engine_used ?? "n/a"}
              </span>
            </p>
            {job.status === "processing" && processingStatusText(job.id) ? (
              <p className="mt-1 text-xs text-blue-300">{processingStatusText(job.id)}</p>
            ) : null}
            {job.output_filename && (
              <p className="text-xs font-mono text-slate-500 truncate" title={job.output_filename}>
                📁 {job.output_filename}
              </p>
            )}

            {job.video_url && (
              <video className="mt-2 w-full rounded-md border border-slate-700" controls src={job.video_url} />
            )}

            {/* Action buttons */}
            {activeTab === "approval" && pendingStatuses.has(job.status) && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={actionInProgress === job.id}
                  className="w-full rounded-lg bg-emerald-800 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => patchJob(job.id, "approved")}
                >
                  {actionInProgress === job.id ? "Approving…" : "Approve"}
                </button>
              </div>
            )}

            {activeTab === "review" && pendingStatuses.has(job.status) && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={actionInProgress === job.id}
                  className="flex-1 rounded-lg bg-emerald-800 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => patchJob(job.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actionInProgress === job.id}
                  className="flex-1 rounded-lg bg-rose-800 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-700 disabled:opacity-50"
                  onClick={() => patchJob(job.id, "rejected")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionInProgress === job.id}
                  className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-neutral-700 disabled:opacity-50"
                  onClick={() => {
                    if (job.athlete_id && job.template_id) {
                      onRegenerate(job.athlete_id, job.template_id);
                    }
                  }}
                >
                  Re-gen
                </button>
              </div>
            )}
          </article>
        ))}

        {/* Empty states */}
        {visibleJobs.length === 0 && activeTab === "all" && (
          <p className="py-8 text-center text-sm text-muted">No jobs yet.</p>
        )}
        {visibleJobs.length === 0 && activeTab === "approval" && (
          <p className="py-8 text-center text-sm text-muted">No jobs waiting for approval.</p>
        )}
        {activeTab === "approval" && !settings.n8n_webhook_url && (
          <p className="rounded-lg border border-neutral-700 bg-neutral-900/50 px-3 py-2 text-xs text-slate-500">
            Delivery webhook not configured — approved videos won&apos;t auto-push to Google Drive. Configure in Settings → API Keys.
          </p>
        )}
        {visibleJobs.length === 0 && activeTab === "review" && (
          <p className="py-8 text-center text-sm text-muted">No jobs need review.</p>
        )}
      </div>
    </div>
  );
};
