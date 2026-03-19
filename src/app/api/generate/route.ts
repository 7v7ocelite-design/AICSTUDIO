import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  assemblePrompt,
  generateFileName,
  getEngineForTier,
  getCostEstimate,
  validatePromptWithClaude,
  generateVideo,
  computeFaceScore,
  fireWebhook,
} from "@/lib/pipeline";
import type { ContentTier } from "@/lib/database.types";

export async function POST(request: NextRequest) {
  const { athlete_id, template_id } = await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, ...data as Record<string, unknown> })}\n\n`)
        );
      }

      try {
        const { data: athlete, error: aErr } = await supabase
          .from("athletes")
          .select("*")
          .eq("id", athlete_id)
          .single();

        if (aErr || !athlete) {
          sendEvent("error", { message: "Athlete not found" });
          controller.close();
          return;
        }

        const { data: template, error: tErr } = await supabase
          .from("templates")
          .select("*")
          .eq("id", template_id)
          .single();

        if (tErr || !template) {
          sendEvent("error", { message: "Template not found" });
          controller.close();
          return;
        }

        // Step 1: Assemble prompt
        const assembledPrompt = assemblePrompt(athlete, template);
        sendEvent("prompt_assembled", { prompt: assembledPrompt });

        // Step 2: Claude validation
        await new Promise((r) => setTimeout(r, 1000));
        const validatedPrompt = await validatePromptWithClaude(assembledPrompt);
        sendEvent("claude_validated", { prompt: validatedPrompt });

        const tier = template.content_tier as ContentTier;
        const engineName = getEngineForTier(tier);
        const cost = getCostEstimate(tier);

        // Get settings for thresholds
        const { data: settingsData } = await supabase
          .from("settings")
          .select("key, value");
        const settings: Record<string, string> = {};
        for (const s of settingsData || []) {
          settings[s.key] = s.value;
        }

        const autoApproveThreshold = parseFloat(settings.auto_approve_threshold || "90");
        const reviewThreshold = parseFloat(settings.review_threshold || "85");
        const maxRetries = parseInt(settings.max_retries || "2");

        // Count existing jobs for version numbering
        const { count: existingCount } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("athlete_id", athlete_id)
          .eq("template_id", template_id);

        const version = (existingCount || 0) + 1;
        const fileName = generateFileName(
          athlete.name,
          template.category,
          template.location,
          version
        );

        // Create initial job record
        const { data: job, error: jobErr } = await supabase
          .from("jobs")
          .insert({
            athlete_id,
            template_id,
            assembled_prompt: assembledPrompt,
            validated_prompt: validatedPrompt,
            status: "generating",
            engine_used: engineName,
            file_name: fileName,
            retry_count: 0,
            cost_estimate: cost,
          })
          .select()
          .single();

        if (jobErr || !job) {
          sendEvent("error", { message: "Failed to create job" });
          controller.close();
          return;
        }

        let currentRetry = 0;
        let finalStatus = "failed";
        let videoUrl: string | null = null;
        let faceScore = 0;

        while (currentRetry <= maxRetries) {
          // Step 3: Generate video
          sendEvent("generating", {
            engine: engineName,
            retry: currentRetry,
            job_id: job.id,
          });

          videoUrl = await generateVideo(
            tier,
            validatedPrompt,
            athlete.reference_photo_url
          );

          // Step 4: Face scoring
          sendEvent("scoring", { engine: engineName });
          await new Promise((r) => setTimeout(r, 1000));
          faceScore = computeFaceScore();

          // Step 5: Auto-routing
          if (faceScore >= autoApproveThreshold) {
            finalStatus = "approved";
            break;
          } else if (faceScore >= reviewThreshold) {
            finalStatus = "needs_review";
            break;
          } else {
            if (currentRetry < maxRetries) {
              currentRetry++;
              sendEvent("retrying", {
                score: Math.round(faceScore * 10) / 10,
                retry: currentRetry,
                maxRetries,
              });
            } else {
              finalStatus = "rejected";
              break;
            }
          }
        }

        // Update job with results
        await supabase
          .from("jobs")
          .update({
            video_url: videoUrl,
            face_score: Math.round(faceScore * 10) / 10,
            status: finalStatus,
            retry_count: currentRetry,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // Step 6: Webhook
        const webhookUrl = settings.n8n_webhook_url;
        if (webhookUrl) {
          await fireWebhook(webhookUrl, {
            event: finalStatus === "approved" ? "video_approved" : "video_needs_review",
            job_id: job.id,
            athlete_name: athlete.name,
            video_url: videoUrl,
            face_score: Math.round(faceScore * 10) / 10,
            engine: engineName,
          });
        }

        sendEvent("complete", {
          status: finalStatus,
          video_url: videoUrl,
          score: Math.round(faceScore * 10) / 10,
          job_id: job.id,
          file_name: fileName,
          engine: engineName,
        });
      } catch (err) {
        sendEvent("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
