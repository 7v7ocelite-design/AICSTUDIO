import { fail, ok } from "@/lib/api";
import { createJob, getJobById, listJobs } from "@/lib/data-service";
import { NextRequest } from "next/server";
import { makeVideoFileName } from "@/lib/utils";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const previous = await getJobById(id);
    if (!previous) return fail("Job not found", 404);

    const jobs = await listJobs();
    const samePairCount = jobs.filter(
      (job) => job.athlete_id === previous.athlete_id && job.template_id === previous.template_id,
    ).length;

    const [athleteName = "Athlete", category = "Category", location = "Location"] = previous.file_name
      .replace(".mp4", "")
      .split("_");

    const newJob = await createJob({
      athlete_id: previous.athlete_id,
      template_id: previous.template_id,
      status: "queued",
      retry_count: 0,
      face_score: null,
      video_url: null,
      engine_used: null,
      assembled_prompt: null,
      final_prompt: null,
      error_message: null,
      file_name: makeVideoFileName({
        athleteName,
        category,
        location,
        version: samePairCount + 1,
      }),
    });

    return ok({ job: newJob }, { status: 201 });
  } catch (error) {
    return fail("Failed to regenerate job", 500, error);
  }
}
