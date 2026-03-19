import { fail, ok } from "@/lib/api";
import { getDashboardStats, listAthletes, listJobs, listTemplates } from "@/lib/data-service";

export async function GET() {
  try {
    const [stats, athletes, jobs, templates] = await Promise.all([
      getDashboardStats(),
      listAthletes(),
      listJobs(),
      listTemplates(),
    ]);
    return ok({
      stats,
      recentActivity: jobs.slice(0, 20),
      totals: {
        athletes: athletes.length,
        jobs: jobs.length,
        templates: templates.length,
      },
    });
  } catch (error) {
    return fail("Failed to load dashboard stats", 500, error);
  }
}
