import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { DashboardBootstrap } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const [{ data: athletes, error: athleteError }, { data: templates, error: templateError }, { data: jobs, error: jobsError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabase.from("athletes").select("*").order("created_at", { ascending: false }),
        supabase.from("templates").select("*").order("created_at", { ascending: false }),
        supabase
          .from("jobs")
          .select("*, athlete:athletes(name), template:templates(variant_name, category)")
          .order("created_at", { ascending: false })
          .limit(25),
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

    const payload: DashboardBootstrap = {
      athletes: athletes ?? [],
      templates: templates ?? [],
      jobs: jobs ?? [],
      settings: settingsMap
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
