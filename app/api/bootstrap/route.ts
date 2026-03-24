import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { seedDefaultTemplates } from "@/lib/seed-templates";
import type { DashboardBootstrap } from "@/lib/types";

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

    // NOTE: Fetch jobs WITHOUT PostgREST embedded JOINs to avoid stale schema cache.
    // The JOIN queries (.select("*, athlete:athletes(name)")) return cached/stale data
    // when the underlying row has been updated via a different query path.
    // Instead, we fetch jobs plain and manually attach athlete/template names.
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

    // Build lookup maps for manual join
    const athleteMap = new Map((athletes ?? []).map((a: Record<string, unknown>) => [a.id, a.name]));
    const templateMap = new Map((templates ?? []).map((t: Record<string, unknown>) => [t.id, { variant_name: t.variant_name, category: t.category, location: t.location }]));

    // Manually attach athlete and template info to each job
    const enrichedJobs = (jobs ?? []).map((job: Record<string, unknown>) => ({
      ...job,
      athlete: job.athlete_id ? { name: athleteMap.get(job.athlete_id) ?? null } : null,
      template: job.template_id ? templateMap.get(job.template_id) ?? null : null
    }));

    const settingsMap = (settings ?? []).reduce<Record<string, string>>((accumulator, current) => {
      accumulator[current.key] = current.value;
      return accumulator;
    }, {});

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
