import { fail } from "@/lib/api";
import {
  createJob,
  getAthleteById,
  getSettings,
  getTemplateById,
  listJobs,
  updateJob,
} from "@/lib/data-service";
import {
  assemblePrompt,
  generateVideo,
  getEngineForTier,
  simulateFaceScore,
  validatePromptWithClaude,
} from "@/lib/pipeline";
import { makeVideoFileName } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let body: { athlete_id?: string; template_id?: string };

  try {
    body = (await request.json()) as { athlete_id?: string; template_id?: string };
  } catch (error) {
    return fail("Invalid JSON body", 400, error);
  }

  const athleteId = body.athlete_id;
  const templateId = body.template_id;
  if (!athleteId || !templateId) {
    return fail("athlete_id and template_id are required", 400);
  }

  const [athlete, template, settings, jobs] = await Promise.all([
    getAthleteById(athleteId),
    getTemplateById(templateId),
    getSettings(),
    listJobs(),
  ]);

  if (!athlete) return fail("Athlete not found", 404);
  if (!template) return fail("Template not found", 404);

  const version =
    jobs.filter((job) => job.athlete_id === athlete.id && job.template_id === template.id).length + 1;
  const fileName = makeVideoFileName({
    athleteName: athlete.name,
    category: template.category,
    location: template.location,
    version,
  });

  const initialJob = await createJob({
    athlete_id: athlete.id,
    template_id: template.id,
    status: "generating",
    retry_count: 0,
    face_score: null,
    video_url: null,
    engine_used: getEngineForTier(template.content_tier),
    file_name: fileName,
    assembled_prompt: null,
    final_prompt: null,
    error_message: null,
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent("job_created", { job_id: initialJob.id, file_name: fileName });

      void (async () => {
        try {
          const assembledPrompt = assemblePrompt(athlete.descriptor, template);
          await updateJob(initialJob.id, { assembled_prompt: assembledPrompt });
          sendEvent("prompt_assembled", { prompt: assembledPrompt });

          const validatedPrompt = await validatePromptWithClaude(assembledPrompt, settings);
          await updateJob(initialJob.id, { final_prompt: validatedPrompt });
          sendEvent("claude_validated", { prompt: validatedPrompt });

          const autoApproveThreshold = parseFloat(settings.auto_approve_threshold || "90");
          const reviewThreshold = parseFloat(settings.review_threshold || "85");
          const maxRetries = settings.max_retries ?? 2;

          let attempt = 0;
          let finalStatus: "approved" | "needs_review" | "rejected" = "rejected";
          let lastFaceScore = 0;
          let latestVideoUrl = "";
          let engineName = getEngineForTier(template.content_tier);

          while (attempt <= maxRetries) {
            attempt += 1;
            sendEvent("generating", { engine: engineName, attempt, tier: template.content_tier });
            const generated = await generateVideo({
              tier: template.content_tier,
              finalPrompt: validatedPrompt,
              referencePhotoUrl: athlete.reference_photo_url,
              settings,
            });
            latestVideoUrl = generated.videoUrl;
            engineName = generated.engine;

            sendEvent("scoring", { message: "Scoring face similarity..." });
            const faceScore = simulateFaceScore();
            lastFaceScore = faceScore;
            sendEvent("face_score", { score: Number(faceScore.toFixed(2)) });

            if (faceScore >= autoApproveThreshold) {
              finalStatus = "approved";
              break;
            }

            if (faceScore >= reviewThreshold) {
              finalStatus = "needs_review";
              break;
            }

            if (attempt <= maxRetries) {
              sendEvent("retrying", {
                reason: "Score below review threshold",
                attempt,
                maxRetries,
              });
            }
          }

          await updateJob(initialJob.id, {
            status: finalStatus,
            retry_count: Math.max(0, attempt - 1),
            face_score: Number(lastFaceScore.toFixed(2)),
            video_url: latestVideoUrl,
            engine_used: engineName,
            final_prompt: validatedPrompt,
          });

          if (settings.n8n_webhook_url) {
            try {
              await fetch(settings.n8n_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: finalStatus === "approved" ? "video_approved" : "video_needs_review",
                  job_id: initialJob.id,
                  athlete_name: athlete.name,
                  video_url: latestVideoUrl,
                  face_score: Number(lastFaceScore.toFixed(2)),
                  engine: engineName,
                }),
              });
            } catch {
              // Best effort; webhook failures should not break generation.
            }
          }

          sendEvent("complete", {
            status: finalStatus,
            video_url: latestVideoUrl,
            score: Number(lastFaceScore.toFixed(2)),
            engine: engineName,
            job_id: initialJob.id,
          });
          controller.close();
        } catch (error) {
          await updateJob(initialJob.id, {
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown generation error",
          });
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Unknown generation error",
            job_id: initialJob.id,
          });
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
