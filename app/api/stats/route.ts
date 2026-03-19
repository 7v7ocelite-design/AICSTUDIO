import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getServerSupabase();

  const [athletesCount, templatesCount, jobsCount, approvedCount, needsReviewCount, queuedCount] =
    await Promise.all([
      supabase.from("athletes").select("*", { count: "exact", head: true }),
      supabase.from("templates").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "processing"])
    ]);

  const errored = [athletesCount, templatesCount, jobsCount, approvedCount, needsReviewCount, queuedCount].find(
    (result) => result.error
  );

  if (errored?.error) {
    return NextResponse.json({ error: errored.error.message }, { status: 500 });
  }

  return NextResponse.json({
    totalAthletes: athletesCount.count ?? 0,
    totalTemplates: templatesCount.count ?? 0,
    totalJobs: jobsCount.count ?? 0,
    approvedJobs: approvedCount.count ?? 0,
    needsReviewJobs: needsReviewCount.count ?? 0,
    queuedJobs: queuedCount.count ?? 0
  });
}
