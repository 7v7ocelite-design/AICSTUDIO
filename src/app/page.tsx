"use client";

import { StatCard, Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getStatusColor, formatDateTime, getTierBadge } from "@/lib/utils";
import type { DashboardStats, Job } from "@/lib/types";
import {
  Users,
  LayoutTemplate,
  Film,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, jobsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/jobs?limit=5"),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (jobsRes.ok) {
          const data = await jobsRes.json();
          setRecentJobs(data.jobs || []);
        }
      } catch {
        // Use fallback data on error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pt-12 lg:pt-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Overview of your content production pipeline
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    total_athletes: 0,
    total_templates: 45,
    total_jobs: 0,
    approved_jobs: 0,
    pending_review: 0,
    success_rate: 0,
  };

  return (
    <div className="space-y-8 pt-12 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Overview of your content production pipeline
          </p>
        </div>
        <Link
          href="/generate"
          className="hidden items-center gap-2 rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-accent/20 transition-all hover:bg-brand-accent-light sm:inline-flex"
        >
          Generate Content
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Athletes"
          value={displayStats.total_athletes}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Templates"
          value={displayStats.total_templates}
          icon={<LayoutTemplate className="h-5 w-5" />}
        />
        <StatCard
          label="Videos Generated"
          value={displayStats.total_jobs}
          icon={<Film className="h-5 w-5" />}
        />
        <StatCard
          label="Success Rate"
          value={`${displayStats.success_rate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={displayStats.success_rate > 90 ? "Above target" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Quick Stats
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-300">Approved Videos</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {displayStats.approved_jobs}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <span className="text-sm text-gray-300">Needs Review</span>
              </div>
              <span className="text-lg font-semibold text-white">
                {displayStats.pending_review}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-brand-accent" />
                <span className="text-sm text-gray-300">
                  Premium / Standard / Social
                </span>
              </div>
              <span className="text-sm font-medium text-gray-300">
                6 / 9 / All
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Activity
            </h2>
            <Link
              href="/queue"
              className="text-sm text-brand-accent hover:text-brand-accent-light"
            >
              View all
            </Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Film className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-400">No jobs yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Generate your first video to see activity here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {job.file_name || "Generating..."}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(job.created_at)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Content Tiers
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              tier: "premium",
              engine: "Runway Gen-4.5",
              categories: 6,
              desc: "Luxury, Fine Dining, Wellness, Motorsports, Yacht, Business",
            },
            {
              tier: "standard",
              engine: "Kling 3.0",
              categories: 9,
              desc: "Adventure, Nightlife, Fitness, Beach, Fashion, Studio, Game Day, Charity, Music",
            },
            {
              tier: "social",
              engine: "Vidu Q3 Pro",
              categories: "All",
              desc: "Quick social media clips from any category",
            },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
            >
              <Badge className={getTierBadge(t.tier)}>{t.tier}</Badge>
              <p className="mt-2 text-sm font-medium text-white">{t.engine}</p>
              <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
              <p className="mt-2 text-xs text-gray-400">
                {t.categories} categories
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
