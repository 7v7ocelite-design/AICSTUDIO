import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [athleteRes, templateRes, jobRes, approvedRes, reviewRes] =
      await Promise.all([
        supabase.from("athletes").select("id", { count: "exact", head: true }),
        supabase.from("templates").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "needs_review"),
      ]);

    const totalJobs = jobRes.count || 0;
    const approvedJobs = approvedRes.count || 0;
    const successRate =
      totalJobs > 0 ? Math.round((approvedJobs / totalJobs) * 100) : 0;

    return NextResponse.json({
      total_athletes: athleteRes.count || 0,
      total_templates: templateRes.count || 0,
      total_jobs: totalJobs,
      approved_jobs: approvedJobs,
      pending_review: reviewRes.count || 0,
      success_rate: successRate,
    });
  } catch {
    return NextResponse.json(
      {
        total_athletes: 0,
        total_templates: 0,
        total_jobs: 0,
        approved_jobs: 0,
        pending_review: 0,
        success_rate: 0,
      },
      { status: 200 }
    );
  }
}
