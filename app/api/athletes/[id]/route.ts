import { fail, ok } from "@/lib/api";
import { deleteAthlete, getAthleteById, updateAthlete } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const athlete = await updateAthlete(id, payload as never);
    if (!athlete) return fail("Athlete not found", 404);
    return ok({ athlete });
  } catch (error) {
    return fail("Failed to update athlete", 500, error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const athlete = await getAthleteById(id);
    if (!athlete) return fail("Athlete not found", 404);
    await deleteAthlete(id);
    return ok({ success: true });
  } catch (error) {
    return fail("Failed to delete athlete", 500, error);
  }
}
