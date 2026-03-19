"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Video,
  CheckCircle,
  Scan,
  DollarSign,
  Loader2,
} from "lucide-react";

interface Stats {
  totalAthletes: number;
  videosGenerated: { today: number; week: number; month: number; total: number };
  approvalRate: number;
  avgFaceScore: number;
  estimatedCostThisMonth: number;
  recentActivity: Array<{
    id: string;
    status: string;
    face_score: number | null;
    engine_used: string;
    created_at: string;
    file_name: string;
    athlete?: { name: string };
    template?: { category: string; variant: string };
  }>;
}

type VideoPeriod = "today" | "week" | "month";

const statusColors: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  needs_review: "bg-yellow-500/20 text-yellow-400",
  rejected: "bg-red-500/20 text-red-400",
  generating: "bg-blue-500/20 text-blue-400",
  pending: "bg-gray-500/20 text-gray-400",
  scoring: "bg-purple-500/20 text-purple-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [videoPeriod, setVideoPeriod] = useState<VideoPeriod>("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Unable to load dashboard data.</p>
        <p className="text-sm mt-2">Make sure your Supabase connection is configured.</p>
      </div>
    );
  }

  const videoCount = stats.videosGenerated[videoPeriod];

  const cards = [
    {
      title: "Total Athletes",
      value: stats.totalAthletes,
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Videos Generated",
      value: videoCount,
      icon: Video,
      color: "text-purple-400",
      extra: (
        <div className="flex gap-1 mt-2">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setVideoPeriod(p)}
              className={`text-xs px-2 py-0.5 rounded ${
                videoPeriod === p
                  ? "bg-brand-accent text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Approval Rate",
      value: `${stats.approvalRate}%`,
      icon: CheckCircle,
      color: stats.approvalRate > 85 ? "text-green-400" : "text-yellow-400",
    },
    {
      title: "Avg Face Score",
      value: stats.avgFaceScore,
      icon: Scan,
      color: "text-cyan-400",
    },
    {
      title: "Est. Cost This Month",
      value: `$${stats.estimatedCostThisMonth.toFixed(2)}`,
      icon: DollarSign,
      color: "text-amber-400",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-brand-card rounded-xl p-5 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={card.color} />
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {card.title}
                </span>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              {card.extra}
            </div>
          );
        })}
      </div>

      <div className="bg-brand-card rounded-xl border border-white/5">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-white/5">
          {stats.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No activity yet. Generate your first video!
            </div>
          ) : (
            stats.recentActivity.map((job) => (
              <div
                key={job.id}
                className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    statusColors[job.status] || "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {job.status.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.athlete?.name || "Unknown"} &mdash;{" "}
                    {job.template?.category} / {job.template?.variant}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{job.file_name}</p>
                </div>
                <span className="text-xs text-gray-400">{job.engine_used}</span>
                {job.face_score !== null && (
                  <span
                    className={`text-xs font-mono ${
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
                <span className="text-xs text-gray-500">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
