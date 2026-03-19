"use client";

import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardStats, Job, Template } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type TimeTab = "today" | "week" | "month";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Job[]>([]);
  const [athletes, setAthletes] = useState<Array<{ id: string; name: string }>>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TimeTab>("today");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [statsRes, athletesRes, templatesRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/athletes"),
          fetch("/api/templates"),
        ]);
        const statsJson = (await statsRes.json()) as { stats: DashboardStats; recentActivity: Job[] };
        const athletesJson = (await athletesRes.json()) as { athletes: Array<{ id: string; name: string }> };
        const templatesJson = (await templatesRes.json()) as { templates: Template[] };
        setStats(statsJson.stats);
        setRecentActivity(statsJson.recentActivity);
        setAthletes(athletesJson.athletes);
        setTemplates(templatesJson.templates);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const athleteNameById = useMemo(
    () => new Map(athletes.map((athlete) => [athlete.id, athlete.name])),
    [athletes],
  );
  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  const videosValue =
    tab === "today" ? stats?.videosToday : tab === "week" ? stats?.videosWeek : stats?.videosMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-400">Performance snapshot and recent generation activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Athletes" value={loading ? null : String(stats?.totalAthletes ?? 0)} />
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-300">Videos Generated</p>
            <div className="rounded-md border border-slate-600/70 p-0.5">
              {(["today", "week", "month"] as TimeTab[]).map((item) => (
                <button
                  key={item}
                  className={`rounded px-2 py-1 text-xs ${
                    tab === item ? "bg-[#2E75B6] text-white" : "text-slate-300"
                  }`}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {loading ? <LoadingSkeleton className="h-8 w-20" /> : <p className="text-3xl font-semibold">{videosValue}</p>}
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-300">Approval Rate</p>
          {loading ? (
            <LoadingSkeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className={`text-3xl font-semibold ${(stats?.approvalRate ?? 0) > 85 ? "text-emerald-300" : ""}`}>
              {(stats?.approvalRate ?? 0).toFixed(1)}%
            </p>
          )}
        </div>
        <StatCard
          title="Avg Face Score"
          value={loading ? null : `${(stats?.avgFaceScore ?? 0).toFixed(1)}%`}
        />
        <StatCard
          title="Estimated Cost This Month"
          value={loading ? null : `$${(stats?.estimatedCostMonth ?? 0).toFixed(2)}`}
        />
      </div>

      <section className="card p-4">
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        {loading ? (
          <div className="space-y-3">
            <LoadingSkeleton className="h-14 w-full" />
            <LoadingSkeleton className="h-14 w-full" />
            <LoadingSkeleton className="h-14 w-full" />
          </div>
        ) : recentActivity.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Athlete</th>
                  <th className="py-2 pr-4">Template</th>
                  <th className="py-2 pr-4">Engine</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((job) => {
                  const template = templateById.get(job.template_id);
                  return (
                    <tr key={job.id} className="border-t border-slate-700/70">
                      <td className="py-2 pr-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-2 pr-4">{athleteNameById.get(job.athlete_id) ?? "Unknown"}</td>
                      <td className="py-2 pr-4">
                        {template ? `${template.category} · ${template.variant}` : "Unknown"}
                      </td>
                      <td className="py-2 pr-4">{job.engine_used ?? "-"}</td>
                      <td className="py-2 pr-4">{job.face_score ? `${job.face_score.toFixed(1)}%` : "-"}</td>
                      <td className="py-2">{new Date(job.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No jobs yet.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-300">{title}</p>
      {value === null ? <LoadingSkeleton className="mt-3 h-8 w-24" /> : <p className="mt-3 text-3xl font-semibold">{value}</p>}
    </div>
  );
}
