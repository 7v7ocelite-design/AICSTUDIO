import { fail, ok } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/data-service";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const settings = await getSettings();
    return ok({ settings });
  } catch (error) {
    return fail("Failed to load settings", 500, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const settings = await updateSettings(payload as never);
    return ok({ settings });
  } catch (error) {
    return fail("Failed to update settings", 500, error);
  }
}
