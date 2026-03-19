"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import type { Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type QueueTab = "approved" | "needs_review" | "all";

export default function QueuePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>("approved");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/jobs?limit=50", { cache: "no-store" });
      const payload = (await response.json()) as { jobs: Job[] };
      setJobs(payload.jobs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") {
      return jobs;
    }
    return jobs.filter((job) => job.status === tab);
  }, [jobs, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue"
        description="Review generated content, confirm auto-approvals, and inspect jobs requiring manual checks."
        actions={
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as QueueTab)}
        tabs={[
          { label: "Approved", value: "approved" },
          { label: "Needs Review", value: "needs_review" },
          { label: "All Jobs", value: "all" }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {tab === "approved" ? "Approved Jobs" : tab === "needs_review" ? "Needs Review" : "All Jobs"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">No jobs available for this tab.</p>
          ) : (
            filtered.map((job) => (
              <div key={job.id} className="rounded-xl border border-border/60 bg-slate-900/40 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100">
                      {job.athlete?.name ?? "Unknown Athlete"} · {job.template?.category ?? "No Category"}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(job.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <Badge variant="neutral">Score: {job.face_score ?? "N/A"}</Badge>
                  </div>
                </div>

                <p className="mb-3 text-sm text-slate-300">{job.filename ?? "Filename pending"}</p>

                {job.video_url ? (
                  <video controls className="w-full rounded-lg border border-border bg-black">
                    <source src={job.video_url} />
                  </video>
                ) : (
                  <p className="text-xs text-slate-500">Video preview unavailable.</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
