"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatDateTime } from "@/lib/utils";
import type { Job } from "@/lib/types";
import {
  ListChecks,
  Film,
  Play,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

type TabKey = "approved" | "needs_review" | "all";

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((j) => {
    if (tab === "approved") return j.status === "approved";
    if (tab === "needs_review") return j.status === "needs_review";
    return true;
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    {
      key: "all",
      label: "All Jobs",
      count: jobs.length,
    },
    {
      key: "approved",
      label: "Approved",
      count: jobs.filter((j) => j.status === "approved").length,
    },
    {
      key: "needs_review",
      label: "Needs Review",
      count: jobs.filter((j) => j.status === "needs_review").length,
    },
  ];

  async function updateJobStatus(jobId: string, status: string) {
    try {
      const res = await fetch("/api/jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, status }),
      });
      if (res.ok) {
        toast.success(`Job ${status}`);
        fetchJobs();
      }
    } catch {
      toast.error("Failed to update job");
    }
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-white">Production Queue</h1>
        <p className="mt-1 text-sm text-gray-400">
          Review and manage generated content
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-brand-accent text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                tab === t.key
                  ? "bg-white/20"
                  : "bg-white/5"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : filteredJobs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="mb-3 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            {tab === "all"
              ? "No jobs yet"
              : `No ${tab.replace("_", " ")} jobs`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Generated videos will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="group flex items-center gap-4 rounded-xl border border-white/5 bg-brand-card p-4 transition-all hover:border-white/10"
            >
              {/* Thumbnail */}
              <div className="hidden h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-black/30 border border-white/5 sm:flex">
                <Film className="h-6 w-6 text-gray-600" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {job.file_name || "Processing..."}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{formatDateTime(job.created_at)}</span>
                  {job.engine && (
                    <>
                      <span>·</span>
                      <span>{job.engine}</span>
                    </>
                  )}
                  {job.face_score !== null && (
                    <>
                      <span>·</span>
                      <span
                        className={
                          job.face_score >= 90
                            ? "text-emerald-400"
                            : "text-orange-400"
                        }
                      >
                        Score: {job.face_score}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <Badge className={getStatusColor(job.status)}>
                {job.status.replace("_", " ")}
              </Badge>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {job.status === "needs_review" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateJobStatus(job.id, "approved")}
                      title="Approve"
                    >
                      <ThumbsUp className="h-4 w-4 text-emerald-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateJobStatus(job.id, "rejected")}
                      title="Reject"
                    >
                      <ThumbsDown className="h-4 w-4 text-red-400" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewJob(job)}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Panel */}
      {previewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewJob(null)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-brand-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Job Details
              </h3>
              <button
                onClick={() => setPreviewJob(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video rounded-lg bg-black/40 flex items-center justify-center mb-4 border border-white/5">
              <div className="flex flex-col items-center gap-2">
                <Play className="h-12 w-12 text-gray-500" />
                <p className="text-sm text-gray-500">Video Preview</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">File Name</p>
                <p className="text-white truncate">{previewJob.file_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge className={getStatusColor(previewJob.status)}>
                  {previewJob.status.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Face Score</p>
                <p className="text-white">{previewJob.face_score ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500">Engine</p>
                <p className="text-white">{previewJob.engine ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="text-white">
                  {formatDateTime(previewJob.created_at)}
                </p>
              </div>
              {previewJob.output_url && (
                <div>
                  <p className="text-gray-500">Output</p>
                  <a
                    href={previewJob.output_url}
                    className="text-brand-accent hover:underline truncate block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
            {previewJob.status === "needs_review" && (
              <div className="mt-4 flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    updateJobStatus(previewJob.id, "approved");
                    setPreviewJob(null);
                  }}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    updateJobStatus(previewJob.id, "rejected");
                    setPreviewJob(null);
                  }}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
