import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { buildOutputFileName } from "@/lib/workflow";
import type { Job } from "@/lib/types";

const ENGINES: Array<"kling" | "runway" | "vidu"> = ["kling", "runway", "vidu"];

const SCORE_BUCKETS = [
  92, 94, 96, 91, 93,
  87, 88, 86, 89,
  80, 78, 82
];

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const [{ data: athletes }, { data: templates }] = await Promise.all([
      supabase.from("athletes").select("id, name").limit(10),
      supabase.from("templates").select("id, variant_name, category, location").limit(10)
    ]);

    if (!athletes?.length || !templates?.length) {
      return NextResponse.json(
        { error: "Need at least one athlete and one template to create mock jobs." },
        { status: 400 }
      );
    }

    const mockJobs: Array<Record<string, unknown>> = [];

    for (let i = 0; i < 5; i++) {
      const athlete = athletes[i % athletes.length];
      const template = templates[i % templates.length];
      const faceScore = SCORE_BUCKETS[i % SCORE_BUCKETS.length];
      const engine = ENGINES[i % ENGINES.length];

      let status: string;
      if (faceScore >= 90) status = "approved";
      else if (faceScore >= 85) status = "needs_review";
      else status = "rejected";

      const outputFilename = buildOutputFileName(
        athlete.name,
        template.category,
        template.location ?? "Studio",
        i + 1
      );

      mockJobs.push({
        athlete_id: athlete.id,
        template_id: template.id,
        status,
        assembled_prompt: `[Mock] AI lifestyle video for ${athlete.name}`,
        face_score: faceScore,
        video_url: null,
        engine_used: engine,
        file_name: outputFilename,
        output_filename: outputFilename,
        retry_count: 0,
        reviewed_at: status === "approved" ? new Date().toISOString() : null
      });
    }

    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert(mockJobs)
      .select("*, athlete:athletes(name), template:templates(variant_name, category, location)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: (inserted ?? []) as Job[] }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
