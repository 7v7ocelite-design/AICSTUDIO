import { fail, ok } from "@/lib/api";
import { getJobById, updateJob } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const existing = await getJobById(id);
    if (!existing) return fail("Job not found", 404);
    const job = await updateJob(id, { status: "rejected" });
    return ok({ job });
  } catch (error) {
    return fail("Failed to reject job", 500, error);
  }
}
