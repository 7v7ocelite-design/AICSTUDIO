"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { TierBadge } from "@/components/ui/tier-badge";
import { Athlete, Job, JobStatus, Template } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type QueueTab = "approved" | "needs_review" | "all";

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>("approved");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [search, setSearch] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [jobsRes, athletesRes, templatesRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/athletes"),
        fetch("/api/templates"),
      ]);
      const jobsJson = (await jobsRes.json()) as { jobs: Job[] };
      const athletesJson = (await athletesRes.json()) as { athletes: Athlete[] };
      const templatesJson = (await templatesRes.json()) as { templates: Template[] };
      setJobs(jobsJson.jobs ?? []);
      setAthletes(athletesJson.athletes ?? []);
      setTemplates(templatesJson.templates ?? []);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const athleteById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const filteredForTab = useMemo(() => {
    if (tab === "approved") return jobs.filter((job) => job.status === "approved");
    if (tab === "needs_review") return jobs.filter((job) => job.status === "needs_review");
    return jobs.filter((job) => {
      const athlete = athleteById.get(job.athlete_id);
      const statusHit = statusFilter === "all" || job.status === statusFilter;
      const searchHit =
        search.trim().length === 0 ||
        athlete?.name.toLowerCase().includes(search.toLowerCase()) ||
        job.file_name.toLowerCase().includes(search.toLowerCase()) ||
        job.engine_used?.toLowerCase().includes(search.toLowerCase());
      return statusHit && Boolean(searchHit);
    });
  }, [jobs, tab, athleteById, statusFilter, search]);

  async function callAction(jobId: string, action: "approve" | "reject" | "regenerate") {
    try {
      const response = await fetch(`/api/jobs/${jobId}/${action}`, { method: "POST" });
      if (!response.ok) throw new Error(`Failed to ${action} job`);
      toast.success(`Job ${action}d`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Queue</h1>
        <p className="text-sm text-slate-400">Review and manage generated jobs.</p>
      </div>

      <div className="inline-flex rounded-lg border border-slate-600 p-1 text-sm">
        {(["approved", "needs_review", "all"] as QueueTab[]).map((item) => (
          <button
            key={item}
            className={`rounded px-3 py-1.5 ${
              tab === item ? "bg-[#2E75B6] text-white" : "text-slate-300"
            }`}
            onClick={() => setTab(item)}
          >
            {item === "needs_review" ? "Needs Review" : item === "approved" ? "Approved" : "All Jobs"}
          </button>
        ))}
      </div>

      {tab === "all" ? (
        <div className="card p-4">
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <input
              className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
              placeholder="Search jobs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as JobStatus | "all")}
            >
              <option value="all">All statuses</option>
              <option value="queued">queued</option>
              <option value="generating">generating</option>
              <option value="approved">approved</option>
              <option value="needs_review">needs_review</option>
              <option value="rejected">rejected</option>
              <option value="failed">failed</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading jobs...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Athlete</th>
                    <th className="py-2 pr-3">Template</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Engine</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForTab.map((job) => {
                    const athlete = athleteById.get(job.athlete_id);
                    const template = templateById.get(job.template_id);
                    return (
                      <tr key={job.id} className="border-t border-slate-700/70">
                        <td className="py-2 pr-3">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="py-2 pr-3">{athlete?.name ?? "Unknown"}</td>
                        <td className="py-2 pr-3">{template?.category ?? "Unknown"}</td>
                        <td className="py-2 pr-3">{job.face_score ? `${job.face_score.toFixed(1)}%` : "-"}</td>
                        <td className="py-2 pr-3">{job.engine_used ?? "-"}</td>
                        <td className="py-2">{new Date(job.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredForTab.map((job) => {
            const athlete = athleteById.get(job.athlete_id);
            const template = templateById.get(job.template_id);
            return (
              <article key={job.id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{athlete?.name ?? "Unknown athlete"}</p>
                    <p className="text-xs text-slate-400">{template?.category ?? "Unknown category"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {template ? <TierBadge tier={template.content_tier} /> : null}
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Score:{" "}
                  <span className={job.face_score && job.face_score >= 90 ? "text-emerald-300" : "text-amber-300"}>
                    {job.face_score ? `${job.face_score.toFixed(1)}%` : "-"}
                  </span>{" "}
                  · {job.engine_used ?? "-"}
                </p>
                {job.video_url ? <video controls src={job.video_url} className="w-full rounded-md" /> : null}
                <div className="flex flex-wrap gap-2">
                  {job.video_url ? (
                    <a
                      href={job.video_url}
                      download
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold"
                    >
                      Download
                    </a>
                  ) : null}
                  {tab === "needs_review" ? (
                    <>
                      <button
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => void callAction(job.id, "approve")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => void callAction(job.id, "reject")}
                      >
                        ❌ Reject
                      </button>
                      <button
                        className="rounded-md bg-[#2E75B6] px-3 py-1.5 text-xs font-semibold"
                        onClick={() => void callAction(job.id, "regenerate")}
                      >
                        🔄 Re-generate
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
