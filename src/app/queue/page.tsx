"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Play,
  Download,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/lib/database.types";

type Tab = "approved" | "needs_review" | "all";

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  needs_review: "bg-yellow-500/20 text-yellow-400",
  rejected: "bg-red-500/20 text-red-400",
  generating: "bg-blue-500/20 text-blue-400",
  pending: "bg-gray-500/20 text-gray-400",
  scoring: "bg-purple-500/20 text-purple-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function QueuePage() {
  const [tab, setTab] = useState<Tab>("approved");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchJobs = () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (tab === "approved") params.set("status", "approved");
    else if (tab === "needs_review") params.set("status", "needs_review");
    else if (statusFilter) params.set("status", statusFilter);

    if (search) params.set("search", search);
    params.set("sort_by", sortBy);
    params.set("sort_order", sortOrder);

    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load jobs"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, statusFilter, sortBy, sortOrder]);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}/approve`, { method: "POST" });
      toast.success("Job approved");
      fetchJobs();
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}/reject`, { method: "POST" });
      toast.success("Job rejected");
      fetchJobs();
    } catch {
      toast.error("Failed to reject");
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      window.location.href = `/generate?athlete=${data.athlete_id}&template=${data.template_id}`;
    } catch {
      toast.error("Failed to regenerate");
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "approved", label: "Approved" },
    { key: "needs_review", label: "Needs Review" },
    { key: "all", label: "All Jobs" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Queue</h1>

      <div className="flex items-center gap-1 mb-6 bg-brand-card rounded-lg p-1 w-fit border border-white/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-accent text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters for "all" tab */}
      {tab === "all" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-brand-card border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-accent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-brand-card border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="needs_review">Needs Review</option>
            <option value="rejected">Rejected</option>
            <option value="generating">Generating</option>
            <option value="failed">Failed</option>
          </select>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split(":");
                setSortBy(by);
                setSortOrder(order);
              }}
              className="bg-brand-card border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="face_score:desc">Highest Score</option>
              <option value="face_score:asc">Lowest Score</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-accent" size={32} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No jobs found</p>
          <p className="text-sm">
            {tab === "approved"
              ? "No approved videos yet."
              : tab === "needs_review"
              ? "No videos pending review."
              : "No jobs in the queue."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-brand-card rounded-xl border border-white/5 overflow-hidden"
            >
              <div className="aspect-video bg-black/30 flex items-center justify-center">
                <Play size={32} className="text-gray-600" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {job.athlete?.name || "Unknown"}
                  </p>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      statusColors[job.status] || statusColors.pending
                    }`}
                  >
                    {job.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {job.template?.category} / {job.template?.variant}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-white/5 rounded">{job.engine_used}</span>
                  {job.face_score !== null && (
                    <span
                      className={`font-mono ${
                        Number(job.face_score) >= 90
                          ? "text-green-400"
                          : Number(job.face_score) >= 85
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {Number(job.face_score).toFixed(1)}%
                    </span>
                  )}
                  <span className="ml-auto">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/5">
                  {tab === "needs_review" && (
                    <>
                      <button
                        onClick={() => handleApprove(job.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(job.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleRegenerate(job.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        <RefreshCw size={12} />
                        Re-gen
                      </button>
                    </>
                  )}
                  {tab !== "needs_review" && (
                    <>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors">
                        <Play size={12} />
                        Play
                      </button>
                      <button className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors">
                        <Download size={12} />
                        Download
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
