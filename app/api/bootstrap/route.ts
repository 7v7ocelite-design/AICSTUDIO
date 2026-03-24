import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { seedDefaultTemplates } from "@/lib/seed-templates";
import type { DashboardBootstrap, Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    // Auto-seed templates on first load (before main queries)
    const { count: templateCount } = await supabase
      .from("templates")
      .select("id", { count: "exact", head: true });

    if ((templateCount ?? 0) === 0) {
      await seedDefaultTemplates(supabase);
    }

    // Fetch jobs WITHOUT PostgREST embedded JOINs to avoid stale cache issue
    const [{ data: athletes, error: athleteError }, { data: templates, error: templateError }, { data: jobs, error: jobsError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabase.from("athletes").select("*").order("created_at", { ascending: false }),
        supabase.from("templates").select("*").order("category", { ascending: true }),
        supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("settings").select("key, value")
      ]);

    if (athleteError || templateError || jobsError || settingsError) {
      throw new Error(
        athleteError?.message || templateError?.message || jobsError?.message || settingsError?.message
      );
    }

    const settingsMap = (settings ?? []).reduce<Record<string, string>>((accumulator, current) => {
      accumulator[current.key] = current.value;
      return accumulator;
    }, {});

    // Build lookup maps for manual join (avoids PostgREST embedded resource cache)
    const athleteMap = new Map<string, string>();
    for (const a of athletes ?? []) {
      athleteMap.set(a.id, a.name);
    }

    const templateMap = new Map<string, { variant_name: string; category: string }>();
    for (const t of templates ?? []) {
      templateMap.set(t.id, { variant_name: t.variant_name, category: t.category });
    }

    // Manually attach athlete and template info to match Job type shape
    const enrichedJobs: Job[] = (jobs ?? []).map((job) => ({
      ...job,
      athlete: job.athlete_id ? { name: athleteMap.get(job.athlete_id) ?? "Unknown" } : null,
      template: job.template_id ? templateMap.get(job.template_id) ?? null : null
    }));

    const payload: DashboardBootstrap = {
      athletes: athletes ?? [],
      templates: templates ?? [],
      jobs: enrichedJobs,
      settings: settingsMap
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
