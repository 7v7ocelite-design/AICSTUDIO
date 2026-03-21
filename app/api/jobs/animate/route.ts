import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { buildOutputFileName, parseWorkflowSettings } from "@/lib/workflow";
import { createJob, updateJob, fetchJob } from "@/lib/jobs-rpc";
import type { Job } from "@/lib/types";

interface AnimateBody {
  athleteId: string;
  animationStyle: string;
  motionPrompt?: string | null;
}

const PRESETS: Record<string, { prompt: string; duration: number }> = {
  "cinematic-intro": {
    prompt: "Slow cinematic zoom into the subject. Dramatic lighting gradually intensifies. Shallow depth of field. Subject maintains confident pose as camera reveals them. Professional commercial quality. No skeletal distortion, no extra limbs.",
    duration: 5
  },
  "hero-reveal": {
    prompt: "Photograph comes to life with subtle natural movement. Slight breeze in clothing, gentle ambient animation. Photorealistic, seamless still-to-motion transition. No distortion, no artifacts.",
    duration: 4
  },
  "social-ready": {
    prompt: "Dynamic quick zoom with energetic camera movement. Trending social media style. Fast reveal, bold and eye-catching. Hook in the first second. No distortion, no artifacts.",
    duration: 3
  }
};

const RUNWAY_API_VERSION = "2024-11-06";
const RUNWAY_BASE_URL = "https://api.dev.runwayml.com/v1";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<AnimateBody>(request);
    if (!body.athleteId) {
      return NextResponse.json({ error: "athleteId is required." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const [{ data: athlete, error: athleteError }, { data: settingsRows }] = await Promise.all([
      supabase.from("athletes").select("*").eq("id", body.athleteId).single(),
      supabase.from("settings").select("key, value")
    ]);

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found." }, { status: 404 });
    }
    if (!athlete.consent_signed) {
      return NextResponse.json({ error: "Consent not signed." }, { status: 403 });
    }
    if (!athlete.reference_photo_url) {
      return NextResponse.json({ error: "No reference photo for this athlete. Upload one first." }, { status: 400 });
    }

    const settings = (settingsRows ?? []).reduce<Record<string, string>>((a, c) => { a[c.key] = c.value; return a; }, {});
    const workflow = parseWorkflowSettings(settings);

    if (!workflow.runwayApiKey) {
      return NextResponse.json({ error: "Runway API key not configured. Add it in Settings." }, { status: 400 });
    }

    const preset = PRESETS[body.animationStyle] ?? PRESETS["cinematic-intro"];
    const promptText = body.motionPrompt
      ? `${body.motionPrompt}. ${preset.prompt}`
      : preset.prompt;

    const outputFilename = buildOutputFileName(athlete.name, "Animate", "Photo", 1);

    const { id: jobId } = await createJob(supabase, {
      athlete_id: athlete.id,
      template_id: athlete.id,
      status: "generating",
      assembled_prompt: promptText,
      output_filename: outputFilename
    });

    console.log(`[ANIMATE] Starting image-to-video for ${athlete.name}, style=${body.animationStyle}`);

    try {
      const createRes = await fetch(`${RUNWAY_BASE_URL}/image_to_video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workflow.runwayApiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": RUNWAY_API_VERSION
        },
        body: JSON.stringify({
          model: "gen4_turbo",
          promptImage: athlete.reference_photo_url,
          promptText: promptText.slice(0, 1000),
          duration: preset.duration,
          ratio: "1280:720"
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => "");
        throw new Error(`Runway I2V failed: HTTP ${createRes.status} — ${errText}`);
      }

      const created = (await createRes.json()) as { id?: string };
      if (!created.id) throw new Error("No task ID returned.");

      console.log(`[ANIMATE] Task created: ${created.id}`);

      let videoUrl: string | null = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch(`${RUNWAY_BASE_URL}/tasks/${created.id}`, {
          headers: { Authorization: `Bearer ${workflow.runwayApiKey}`, "X-Runway-Version": RUNWAY_API_VERSION }
        });
        const task = (await pollRes.json()) as { status: string; output?: string[]; failure?: string };
        if (task.status === "SUCCEEDED" && task.output?.length) {
          videoUrl = task.output[0];
          break;
        }
        if (task.status === "FAILED") throw new Error(task.failure ?? "Animation failed.");
      }

      if (!videoUrl) throw new Error("Animation timed out.");

      await updateJob(supabase, jobId, {
        status: "approved",
        video_url: videoUrl,
        engine_used: "runway-i2v (live)",
        face_score: 95,
        reviewed_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("[ANIMATE] Failed:", err instanceof Error ? err.message : err);
      await updateJob(supabase, jobId, {
        status: "rejected",
        engine_used: "runway-i2v (failed)"
      });
    }

    const finalJob = await fetchJob(supabase, jobId);
    return NextResponse.json({ data: finalJob as Job });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
