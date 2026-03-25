"use client";

import { useEffect, useRef, useState } from "react";

import type { Job } from "@/lib/types";

interface PollOptions {
  accessToken?: string;
  intervalMs?: number;
  maxPolls?: number;
  actionLabel?: string;
  toast?: (message: string, tone?: "success" | "error" | "info") => void;
  onUpdate?: (job: Job) => void;
  onProcessing?: (job: Job, meta: { elapsedSeconds: number; message: string; progressPercent?: number }) => void;
  onDone?: (job: Job) => void;
  onFailed?: (job: Job, message: string) => void;
  onTimeout?: (message: string) => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toProgressPercent = (job: Job & { progress?: number | null; _runway?: { progress?: number | null } }): number | null => {
  const rawProgress =
    typeof job.progress === "number"
      ? job.progress
      : typeof job._runway?.progress === "number"
        ? job._runway.progress
        : null;
  if (rawProgress === null) return null;
  const normalized = rawProgress <= 1 ? rawProgress * 100 : rawProgress;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

export async function pollUntilDone(jobId: string, options: PollOptions = {}): Promise<Job | null> {
  const {
    accessToken,
    intervalMs = 10_000,
    maxPolls = 60,
    actionLabel = "Generating",
    onProcessing,
    onDone,
    onFailed,
    onTimeout
  } = options;

  for (let i = 0; i < maxPolls; i += 1) {
    await sleep(intervalMs);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      if (!res.ok) continue;

      const job = (await res.json()) as Job & { progress?: number | null; _runway?: { progress?: number | null } };
      options.onUpdate?.(job);

      if (job.status === "completed" || job.status === "approved") {
        options.toast?.("Video ready!", "success");
        onDone?.(job);
        return job;
      }

      if (job.status === "failed" || job.status === "rejected") {
        const failMessage = job.error_message || "Unknown error";
        options.toast?.(`${actionLabel} failed: ${failMessage}`, "error");
        onFailed?.(job, failMessage);
        return job;
      }

      const elapsed = Math.round(((i + 1) * intervalMs) / 1000);
      const progressPercent = toProgressPercent(job);
      const message =
        progressPercent !== null
          ? `${actionLabel} with Runway... (${progressPercent}% • ${elapsed}s elapsed)`
          : `${actionLabel} with Runway... (${elapsed}s elapsed)`;

      options.toast?.(message, "info");
      onProcessing?.(job, { elapsedSeconds: elapsed, message, progressPercent: progressPercent ?? undefined });
    } catch {
      // Ignore transient errors and continue polling.
    }
  }

  const timeoutMessage = `Timed out waiting for ${actionLabel.toLowerCase()}. Check job queue.`;
  options.toast?.(timeoutMessage, "error");
  onTimeout?.(timeoutMessage);
  return null;
}

interface UseJobPollingArgs {
  jobs: Job[];
  accessToken?: string;
  onJobUpdate: (job: Job) => void;
}

interface JobProgressState {
  progress: number;
  elapsed: number;
  runwayStatus: string | null;
  hasRealProgress: boolean;
}

export function useJobPolling({ jobs, accessToken, onJobUpdate }: UseJobPollingArgs) {
  const [jobProgress, setJobProgress] = useState<Record<string, JobProgressState>>({});
  const pollIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    const processingJobs = jobs.filter((j) => j.status === "processing");
    const currentIntervals = pollIntervalsRef.current;
    const processingIds = new Set(processingJobs.map((job) => job.id));

    for (const job of processingJobs) {
      if (currentIntervals[job.id]) continue;

      setJobProgress((prev) => ({
        ...prev,
        [job.id]: prev[job.id] ?? { progress: 0, elapsed: 0, runwayStatus: null, hasRealProgress: false }
      }));

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${job.id}/status`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
          });
          if (!res.ok) return;

          const data = (await res.json()) as Job & { progress?: number | null; runway_status?: string | null };

          if (data.status === "completed" || data.status === "failed" || data.status === "approved" || data.status === "rejected") {
            clearInterval(currentIntervals[job.id]);
            delete currentIntervals[job.id];
            onJobUpdate(data);
            setJobProgress((prev) => {
              const next = { ...prev };
              delete next[job.id];
              return next;
            });
            return;
          }

          const rawProgress = typeof data.progress === "number" ? data.progress : null;
          const runwayStatus = typeof data.runway_status === "string" ? data.runway_status : null;
          setJobProgress((prev) => {
            const current = prev[job.id] ?? { progress: 0, elapsed: 0, runwayStatus: null, hasRealProgress: false };
            let nextProgress = current.progress;
            let hasRealProgress = current.hasRealProgress;

            if (rawProgress !== null && rawProgress > 0) {
              const progressPercent = Math.round(Math.max(0, Math.min(1, rawProgress)) * 100);
              nextProgress = progressPercent;
              hasRealProgress = true;
            } else if (!hasRealProgress) {
              const estimatedProgress = Math.min(90, (current.elapsed / 300) * 100);
              nextProgress = Math.max(current.progress, estimatedProgress);
            }

            return {
              ...prev,
              [job.id]: {
                ...current,
                progress: nextProgress,
                runwayStatus: runwayStatus ?? current.runwayStatus,
                hasRealProgress
              }
            };
          });

          onJobUpdate(data);
        } catch {
          // Keep polling on transient failures.
        }
      }, 10_000);

      currentIntervals[job.id] = interval;
    }

    for (const jobId of Object.keys(currentIntervals)) {
      if (!processingIds.has(jobId)) {
        clearInterval(currentIntervals[jobId]);
        delete currentIntervals[jobId];
        setJobProgress((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
      }
    }
  }, [accessToken, jobs, onJobUpdate]);

  useEffect(() => {
    const tick = setInterval(() => {
      setJobProgress((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          next[id] = { ...next[id], elapsed: next[id].elapsed + 1 };
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(pollIntervalsRef.current)) {
        clearInterval(pollIntervalsRef.current[id]);
      }
      pollIntervalsRef.current = {};
    };
  }, []);

  return { jobProgress };
}
