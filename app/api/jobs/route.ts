import { fail, ok } from "@/lib/api";
import { listJobs } from "@/lib/data-service";
import { JobStatus } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") as JobStatus | null;
    const jobs = await listJobs(status ?? undefined);
    return ok({ jobs });
  } catch (error) {
    return fail("Failed to load jobs", 500, error);
  }
}
