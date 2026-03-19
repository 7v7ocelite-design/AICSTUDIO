import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [
    { count: athleteCount },
    { data: allJobs },
    { data: recentJobs },
  ] = await Promise.all([
    supabase.from("athletes").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("status, face_score, cost_estimate, created_at, engine_used"),
    supabase
      .from("jobs")
      .select("*, athletes(name), templates(category, variant)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const jobs = allJobs || [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const todayJobs = jobs.filter((j) => j.created_at >= todayStart).length;
  const weekJobs = jobs.filter((j) => j.created_at >= weekStart).length;
  const monthJobs = jobs.filter((j) => j.created_at >= monthStart).length;

  const approvedJobs = jobs.filter((j) => j.status === "approved").length;
  const completedJobs = jobs.filter((j) =>
    ["approved", "needs_review", "rejected"].includes(j.status)
  ).length;
  const approvalRate = completedJobs > 0 ? Math.round((approvedJobs / completedJobs) * 100) : 0;

  const scoredJobs = jobs.filter((j) => j.face_score !== null);
  const avgFaceScore =
    scoredJobs.length > 0
      ? Math.round(
          (scoredJobs.reduce((a, j) => a + Number(j.face_score), 0) / scoredJobs.length) * 10
        ) / 10
      : 0;

  const monthCost = jobs
    .filter((j) => j.created_at >= monthStart)
    .reduce((a, j) => a + Number(j.cost_estimate || 0), 0);

  const recent = (recentJobs || []).map((j: Record<string, unknown>) => ({
    ...j,
    athlete: j.athletes,
    template: j.templates,
    athletes: undefined,
    templates: undefined,
  }));

  return NextResponse.json({
    totalAthletes: athleteCount || 0,
    videosGenerated: { today: todayJobs, week: weekJobs, month: monthJobs, total: jobs.length },
    approvalRate,
    avgFaceScore,
    estimatedCostThisMonth: Math.round(monthCost * 100) / 100,
    recentActivity: recent,
  });
}
