import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { seedDefaultTemplates } from "@/lib/seed-templates";
import { publicEnv, serverEnv } from "@/lib/env";
import type { DashboardBootstrap } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/**
 * Create a throwaway Supabase client whose every fetch() call uses
 * { cache: "no-store" }.  This prevents Next.js from serving a
 * cached response AND tells the runtime not to de-duplicate the
 * request with any in-flight fetch for the same URL.
 */
const freshClient = () =>
  createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, { ...init, cache: "no-store" })
    }
  });

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);

    // Use the singleton for the seed check (cheap, idempotent)
    const shared = getAdminSupabase();
    const { count: templateCount } = await shared
      .from("templates")
      .select("id", { count: "exact", head: true });

    if ((templateCount ?? 0) === 0) {
      await seedDefaultTemplates(shared);
    }

    // --- Fresh client for the real queries (no cache) ---
    const supabase = freshClient();

    // Fetch jobs WITHOUT PostgREST embedded JOINs to avoid query-plan
    // cache returning stale rows.  We do manual lookups instead.
    const [
      { data: athletes, error: athleteError },
      { data: templates, error: templateError },
      { data: rawJobs, error: jobsError },
      { data: settings, error: settingsError }
    ] = await Promise.all([
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
        athleteError?.message ||
        templateError?.message ||
        jobsError?.message ||
        settingsError?.message
      );
    }

    // --- Manual joins: attach athlete name + template info to each job ---
    const athleteMap = new Map(
      (athletes ?? []).map((a: { id: string; name: string }) => [a.id, a])
    );
    const templateMap = new Map(
      (templates ?? []).map((t: { id: string; variant_name: string; category: string; location: string }) => [t.id, t])
    );

    const jobs = (rawJobs ?? []).map((j: Record<string, unknown>) => {
      const ath = athleteMap.get(j.athlete_id as string);
      const tpl = templateMap.get(j.template_id as string);
      return {
        ...j,
        athlete: ath ? { name: ath.name } : null,
        template: tpl
          ? { variant_name: tpl.variant_name, category: tpl.category, location: tpl.location }
          : null
      };
    });

    const settingsMap = (settings ?? []).reduce<Record<string, string>>(
      (accumulator, current) => {
        accumulator[current.key] = current.value;
        return accumulator;
      },
      {}
    );

    const payload: DashboardBootstrap = {
      athletes: athletes ?? [],
      templates: templates ?? [],
      jobs,
      settings: settingsMap
    };

    return NextResponse.json(
      { data: payload },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache"
        }
      }
    );
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
