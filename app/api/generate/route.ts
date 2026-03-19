import { getServerSupabase } from "@/lib/supabase";
import type {
  Athlete,
  GenerateRequestPayload,
  JobStatus,
  PipelineProgressEvent,
  Template
} from "@/lib/types";
import { buildPrompt, generateVideoFilename, getProviderByTier, sleep } from "@/lib/utils";

const encoder = new TextEncoder();
const streamHeaders = {
  "Content-Type": "text/event-stream",
  Connection: "keep-alive",
  "Cache-Control": "no-cache, no-transform"
};

function toSSE(data: PipelineProgressEvent) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequestPayload;
  const supabase = getServerSupabase();

  const [{ data: athlete }, { data: template }] = await Promise.all([
    supabase.from("athletes").select("*").eq("id", body.athleteId).single<Athlete>(),
    supabase.from("templates").select("*").eq("id", body.templateId).single<Template>()
  ]);

  if (!athlete || !template) {
    return new Response("Athlete or template not found", { status: 404 });
  }

  const prompt = buildPrompt(athlete, template, body.customDirection);
  const provider = getProviderByTier(template.content_tier);
  const filename = generateVideoFilename(athlete.name, template.category, template.location);
  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/generated-videos/${filename}`;

  let jobId = crypto.randomUUID();
  const { data: insertedJob } = await supabase
    .from("jobs")
    .insert({
      athlete_id: athlete.id,
      template_id: template.id,
      prompt,
      status: "processing",
      progress: 0,
      content_tier: template.content_tier,
      provider,
      filename
    })
    .select("id")
    .single();

  if (insertedJob?.id) {
    jobId = insertedJob.id;
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          toSSE({
            step: "initializing",
            message: "Initializing generation pipeline...",
            progress: 5,
            jobId
          })
        );
        await sleep(3000);

        controller.enqueue(
          toSSE({
            step: "prompt_assembly",
            message: "Prompt assembled from athlete + template context.",
            progress: 20,
            jobId
          })
        );
        await sleep(3000);

        // SIMULATED: Claude validation call.
        controller.enqueue(
          toSSE({
            step: "validation",
            message: "Prompt validated with Claude AI safety/style checks.",
            progress: 35,
            jobId
          })
        );
        await sleep(3000);

        // SIMULATED: Route generation request to model provider API.
        controller.enqueue(
          toSSE({
            step: "rendering",
            message: `Rendering with ${provider} (${template.content_tier} tier).`,
            progress: 60,
            provider,
            jobId
          })
        );
        await sleep(3000);

        const faceScore = Math.floor(Math.random() * 16) + 85;
        controller.enqueue(
          toSSE({
            step: "face_scoring",
            message: `Face scoring completed: ${faceScore}/100.`,
            progress: 78,
            faceScore,
            jobId
          })
        );
        await sleep(3000);

        let status: JobStatus = "rejected";
        if (faceScore >= 90) {
          status = "approved";
        } else if (faceScore >= 85) {
          status = "needs_review";
        } else {
          status = "rejected";
        }

        controller.enqueue(
          toSSE({
            step: "routing",
            message:
              status === "approved"
                ? "Score >= 90. Auto-approved."
                : status === "needs_review"
                  ? "Score 85-89. Sent to review queue."
                  : "Score < 85. Marked rejected for retry.",
            progress: 88,
            status,
            jobId
          })
        );
        await sleep(3000);

        const { data: webhookSetting } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "webhook_url")
          .maybeSingle();

        if (webhookSetting?.value) {
          // SIMULATED: webhook notification dispatch.
          await sleep(3000);
          controller.enqueue(
            toSSE({
              step: "webhook",
              message: "Webhook notification sent (simulated).",
              progress: 95,
              jobId
            })
          );
        }

        await supabase
          .from("jobs")
          .update({
            status,
            face_score: faceScore,
            video_url: videoUrl,
            progress: 100,
            provider,
            filename
          })
          .eq("id", jobId);

        controller.enqueue(
          toSSE({
            step: "completed",
            message: "Generation completed successfully.",
            progress: 100,
            status,
            faceScore,
            jobId,
            filename,
            videoUrl,
            provider
          })
        );
      } catch (error) {
        controller.enqueue(
          toSSE({
            step: "error",
            message: "Pipeline failed. Please retry generation.",
            progress: 100
          })
        );

        await supabase.from("jobs").update({ status: "rejected", error: String(error) }).eq("id", jobId);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: streamHeaders });
}
