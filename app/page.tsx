"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileVideo, ShieldAlert, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats, Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const initialStats: DashboardStats = {
  totalAthletes: 0,
  totalTemplates: 0,
  totalJobs: 0,
  approvedJobs: 0,
  needsReviewJobs: 0,
  queuedJobs: 0
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResponse, jobsResponse] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/jobs?limit=8", { cache: "no-store" })
        ]);

        if (statsResponse.ok) {
          const statsPayload = (await statsResponse.json()) as DashboardStats;
          setStats(statsPayload);
        }

        if (jobsResponse.ok) {
          const jobsPayload = (await jobsResponse.json()) as { jobs: Job[] };
          setJobs(jobsPayload.jobs ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Track athlete video production throughput, approvals, and review thresholds in one command center."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          <>
            <StatsCard
              label="Athletes"
              value={stats.totalAthletes}
              icon={Users}
              hint="Total athlete profiles"
            />
            <StatsCard
              label="Templates"
              value={stats.totalTemplates}
              icon={FileVideo}
              hint="Prompt variants available"
            />
            <StatsCard
              label="Approved"
              value={stats.approvedJobs}
              icon={CheckCircle2}
              hint="Auto-approved generations"
            />
            <StatsCard
              label="Needs Review"
              value={stats.needsReviewJobs}
              icon={ShieldAlert}
              hint="Manual approvals required"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-slate-400">No jobs yet. Start on the Generate page.</p>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-100">
                    {job.athlete?.name ?? "Unknown Athlete"} - {job.template?.category ?? "Template"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(job.created_at)} · {job.provider ?? "Provider TBD"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <Badge
                    variant={
                      job.status === "approved"
                        ? "success"
                        : job.status === "needs_review"
                          ? "warning"
                          : job.status === "rejected"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {job.status.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
