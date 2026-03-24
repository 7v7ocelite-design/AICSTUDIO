import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const jobId = "44775a4f-6af8-497a-8f25-e00faebcfa13";

    const { data: before, error: readErr } = await supabase
      .from("jobs")
      .select("id, status, video_url, engine_used, error_message")
      .eq("id", jobId)
      .single();

    const { data: updateData, error: updateErr } = await supabase
      .from("jobs")
      .update({
        status: "completed",
        video_url: "https://test-debug.mp4",
        engine_used: "debug-test",
        error_message: null
      })
      .eq("id", jobId)
      .select("id, status, video_url, engine_used, error_message")
      .single();

    const { data: after, error: readAfterErr } = await supabase
      .from("jobs")
      .select("id, status, video_url, engine_used, error_message")
      .eq("id", jobId)
      .single();

    return NextResponse.json({
      before: before || readErr?.message,
      updateResult: updateData || null,
      updateError: updateErr ? { message: updateErr.message, details: updateErr.details, hint: updateErr.hint, code: updateErr.code } : null,
      after: after || readAfterErr?.message,
      persisted: after?.status === "completed"
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
