"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@/lib/types";

/* ────────── Types ────────── */

export interface JobProgressState {
  progress: number;
  elapsed: number;
  runwayStatus: string | null;
  hasRealProgress: boolean;
}

interface PollResponse extends Job {
  progress?: number | null;
  runway_status?: string | null;
  _runway?: { progress?: number | null };
}

const TERMINAL_STATUSES = new Set(["completed", "approved", "rejected", "failed"]);
const POLL_INTERVAL_MS = 10_000;
const MAX_SEQUENTIAL_POLLS = 60; // 60 x 10s = 10 minutes

/* ────────── Core: single poll call ────────── */

async function fetchJobStatus(jobId: string, accessToken?: string): Promise<PollResponse | null> {
  try {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`/api/jobs/${jobId}/status`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as PollResponse;
  } catch {
    return null; // network error — caller retries
  }
}

/** Normalize Runway progress: 0-1 float → 0-100, or clamp if already 0-100. */
function normalizeProgress(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (raw <= 1) return Math.round(raw * 100);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/* ═══════════════════════════════════════════════════════════
 * pollUntilDone — sequential async poller
 *
 * Used by: generate-view, text-to-video, animate-photo
 * These components kick off a generation and then await
 * completion in a single async loop.
 * ═══════════════════════════════════════════════════════════ */

export interface PollUntilDoneOptions {
  jobId: string;
  accessToken?: string;
  /** Called with every poll response (including intermediate). */
  onUpdate: (job: Job) => void;
  /** Progress / toast callback. */
  onProgress?: (message: string, type: "info" | "success" | "error") => void;
  /** Label for the action, e.g. "Generating" or "Animating". Default: "Generating". */
  actionLabel?: string;
}

export async function pollUntilDone(opts: PollUntilDoneOptions): Promise<Job | null> {
  const { jobId, accessToken, onUpdate, onProgress, actionLabel = "Generating" } = opts;

  for (let i = 0; i < MAX_SEQUENTIAL_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const data = await fetchJobStatus(jobId, accessToken);
    if (!data) continue;

    if (data.status === "completed" || data.status === "approved") {
      onUpdate(data);
      onProgress?.("Video ready!", "success");
      return data;
    }

    if (data.status === "failed") {
      onUpdate(data);
      onProgress?.(`${actionLabel} failed: ${data.error_message || "Unknown error"}`, "error");
      return data;
    }

    // Still processing — relay update
    onUpdate(data);
    const elapsed = (i + 1) * 10;
    const rawProgress = data.progress ?? data._runway?.progress ?? null;
    const pct = normalizeProgress(typeof rawProgress === "number" ? rawProgress : null);

    if (pct !== null && pct > 0) {
      onProgress?.(`${actionLabel} with Runway... (${pct}% • ${elapsed}s elapsed)`, "info");
    } else {
      onProgress?.(`${actionLabel} with Runway... (${elapsed}s elapsed)`, "info");
    }
  }

  onProgress?.("Timed out waiting for video. Check job queue.", "error");
  return null;
}

/* ═══════════════════════════════════════════════════════════
 * useJobPolling — interval-based multi-job poller hook
 *
 * Used by: job-queues
 * Manages parallel polling intervals for all jobs with
 * status === "processing".
 * ═══════════════════════════════════════════════════════════ */

export interface UseJobPollingOptions {
  jobs: Job[];
  accessToken: string;
  onJobUpdate: (updatedJob: Job) => void;
}

export function useJobPolling({ jobs, accessToken, onJobUpdate }: UseJobPollingOptions) {
  const [jobProgress, setJobProgress] = useState<Record<string, JobProgressState>>({});
  const pollIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Stable ref so interval closures always see the latest callback
  const onJobUpdateRef = useRef(onJobUpdate);
  onJobUpdateRef.current = onJobUpdate;

  // Main polling effect — start/stop intervals as jobs enter/leave processing
  useEffect(() => {
    const processingJobs = jobs.filter((j) => j.status === "processing");
    const currentIntervals = pollIntervalsRef.current;
    const processingIds = new Set(processingJobs.map((j) => j.id));

    for (const job of processingJobs) {
      if (currentIntervals[job.id]) continue; // already polling

      // Initialize progress state
      setJobProgress((prev) => ({
        ...prev,
        [job.id]: prev[job.id] ?? { progress: 0, elapsed: 0, runwayStatus: null, hasRealProgress: false },
      }));

      const interval = setInterval(async () => {
        // Time-based estimate (only when API hasn't returned real progress)
        setJobProgress((prev) => {
          const current = prev[job.id];
          if (!current || current.hasRealProgress || current.runwayStatus) return prev;
          const estimatedProgress = Math.min(95, (current.elapsed / 180) * 100);
          return {
            ...prev,
            [job.id]: { ...current, progress: Math.max(current.progress, estimatedProgress) },
          };
        });

        const data = await fetchJobStatus(job.id, accessToken);
        if (!data) return; // network error — keep trying

        // Terminal state → clean up
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(currentIntervals[job.id]);
          delete currentIntervals[job.id];
          onJobUpdateRef.current(data);
          setJobProgress((prev) => {
            const next = { ...prev };
            delete next[job.id];
            return next;
          });
          return;
        }

        // Still processing — update progress state
        const rawProgress = normalizeProgress(data.progress);
        const runwayStatus = typeof data.runway_status === "string" ? data.runway_status : null;

        setJobProgress((prev) => {
          const current = prev[job.id] ?? { progress: 0, elapsed: 0, runwayStatus: null, hasRealProgress: false };
          let nextProgress = current.progress;
          let hasRealProgress = current.hasRealProgress;

          if (rawProgress !== null && rawProgress > 0) {
            nextProgress = rawProgress;
            hasRealProgress = true;
          } else if (!hasRealProgress) {
            const estimated = Math.min(90, (current.elapsed / 300) * 100);
            nextProgress = Math.max(current.progress, estimated);
          }

          return {
            ...prev,
            [job.id]: {
              ...current,
              progress: nextProgress,
              runwayStatus: runwayStatus ?? current.runwayStatus,
              hasRealProgress,
            },
          };
        });
      }, POLL_INTERVAL_MS);

      currentIntervals[job.id] = interval;
    }

    // Clean up intervals for jobs no longer processing
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
  }, [accessToken, jobs]);

  // Elapsed-time tick (1s)
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

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      for (const id of Object.keys(pollIntervalsRef.current)) {
        clearInterval(pollIntervalsRef.current[id]);
      }
      pollIntervalsRef.current = {};
    };
  }, []);

  /** Human-readable status text for a processing job. */
  const getStatusText = useCallback(
    (jobId: string): string | null => {
      const state = jobProgress[jobId];
      if (!state) return null;
      const pct = `${Math.round(state.progress)}%`;
      if (state.runwayStatus) {
        return `Generating with Runway... (${state.elapsed}s elapsed · ${state.runwayStatus} · ${pct})`;
      }
      return `Generating with Runway... (${state.elapsed}s elapsed · ${pct})`;
    },
    [jobProgress]
  );

  return { jobProgress, getStatusText };
}
