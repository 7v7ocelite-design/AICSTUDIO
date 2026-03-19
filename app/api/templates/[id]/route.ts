import { fail, ok } from "@/lib/api";
import { deleteTemplate, updateTemplate } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const template = await updateTemplate(id, payload as never);
    if (!template) return fail("Template not found", 404);
    return ok({ template });
  } catch (error) {
    return fail("Failed to update template", 500, error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteTemplate(id);
    return ok({ success: true });
  } catch (error) {
    return fail("Failed to delete template", 500, error);
  }
}
