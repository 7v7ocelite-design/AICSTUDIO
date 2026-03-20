import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { callDeliveryWebhook } from "@/lib/workflow";
import type { Job } from "@/lib/types";

interface PatchBody {
  status: "approved" | "rejected";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<PatchBody>(request);

    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: job, error: updateError } = await supabase
      .from("jobs")
      .update({
        status: body.status,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("*, athlete:athletes(name), template:templates(variant_name, category, location)")
      .single();

    if (updateError || !job) {
      return NextResponse.json(
        { error: updateError?.message ?? "Job not found." },
        { status: 404 }
      );
    }

    if (body.status === "approved") {
      // Fire post-approval delivery webhook (n8n → Google Drive + Metricool)
      const { data: settingsRows } = await supabase
        .from("settings")
        .select("key, value")
        .eq("key", "n8n_webhook_url")
        .single();
      const webhookUrl = settingsRows?.value ?? "";
      await callDeliveryWebhook(webhookUrl, job);

      if (job.athlete_id) {
        const { data: athlete } = await supabase
          .from("athletes")
          .select("videos_generated")
          .eq("id", job.athlete_id)
          .single();
        if (athlete) {
          await supabase
            .from("athletes")
            .update({ videos_generated: (athlete.videos_generated ?? 0) + 1 })
            .eq("id", job.athlete_id);
        }
      }
    }

    return NextResponse.json({ data: job as Job });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
