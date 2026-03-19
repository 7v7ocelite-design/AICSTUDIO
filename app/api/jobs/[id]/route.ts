import { fail, ok } from "@/lib/api";
import { getJobById } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = await getJobById(id);
    if (!job) return fail("Job not found", 404);
    return ok({ job });
  } catch (error) {
    return fail("Failed to load job detail", 500, error);
  }
}
