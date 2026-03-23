import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { buildOutputFileName, parseWorkflowSettings } from "@/lib/workflow";
import { createJob, updateJob, fetchJob } from "@/lib/jobs-rpc";
import type { Job } from "@/lib/types";

export const maxDuration = 30;

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
      template_id: null,
      status: "generating",
      assembled_prompt: promptText,
      output_filename: outputFilename
    });

    console.log(`[ANIMATE] Starting image-to-video for ${athlete.name}, style=${body.animationStyle}`);

    try {
      const { createRunwayTaskOnly } = await import("@/lib/engines");

      // Generate a signed URL so Runway can download the reference photo.
      // Public URLs only work if the bucket is set to public access.
      let imageUrl = athlete.reference_photo_url;

      // Extract the storage path from the public URL
      // Format: https://<project>.supabase.co/storage/v1/object/public/reference-photos/<path>
      const publicPrefix = "/storage/v1/object/public/reference-photos/";
      const pathIndex = imageUrl.indexOf(publicPrefix);
      if (pathIndex !== -1) {
        const storagePath = imageUrl.substring(pathIndex + publicPrefix.length);
        const { data: signedData, error: signedError } = await supabase.storage
          .from("reference-photos")
          .createSignedUrl(storagePath, 600); // 10-minute expiry
        if (signedData?.signedUrl && !signedError) {
          imageUrl = signedData.signedUrl;
          console.log("[ANIMATE] Using signed URL for reference photo");
        } else {
          console.warn("[ANIMATE] Signed URL failed, using original URL:", signedError?.message);
        }
      }

      const { taskId } = await createRunwayTaskOnly(workflow.runwayApiKey, {
        prompt: promptText,
        referencePhotoUrl: imageUrl,
        durationSeconds: preset.duration
      });

      // Save runway_task_id for polling
      await supabase
        .from("jobs")
        .update({
          status: "processing",
          runway_task_id: taskId,
          engine_used: "runway-i2v"
        })
        .eq("id", jobId);

      console.log(`[ANIMATE] Job ${jobId} created with runway_task_id=${taskId} — returning for polling`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[ANIMATE] Failed:", errMsg);
      console.error("[ANIMATE] Stack:", err instanceof Error ? err.stack : "");
      await updateJob(supabase, jobId, {
        status: "rejected",
        engine_used: "runway-i2v (failed)",
        error_message: errMsg
      });
    }

    const finalJob = await fetchJob(supabase, jobId);
    return NextResponse.json({ data: finalJob as Job });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
