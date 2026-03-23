import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = getAdminSupabase();
  const { data: rows } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const r of rows ?? []) settings[r.key] = r.value;

  const apiKey = settings["runway_api_key"] ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "No runway_api_key in settings" });
  }

  const RUNWAY_BASE_URL = "https://api.dev.runwayml.com/v1";
  const RUNWAY_API_VERSION = "2024-11-06";

  // Test 1: Auth check (same as health endpoint)
  let authStatus = "unknown";
  try {
    const authRes = await fetch(`${RUNWAY_BASE_URL}/tasks/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": RUNWAY_API_VERSION }
    });
    authStatus = `HTTP ${authRes.status}`;
  } catch (e: any) {
    authStatus = `Error: ${e.message}`;
  }

  // Test 2: Actual task creation (text-to-video)
  let createStatus = "unknown";
  let createBody = "";
  try {
    const res = await fetch(`${RUNWAY_BASE_URL}/text_to_video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_API_VERSION
      },
      body: JSON.stringify({
        model: "gen4.5",
        promptText: "A football player running across a field at sunset, cinematic quality",
        duration: 5,
        ratio: "1280:720"
      })
    });
    createStatus = `HTTP ${res.status}`;
    createBody = await res.text();
  } catch (e: any) {
    createStatus = `Error: ${e.message}`;
    createBody = String(e);
  }

  return NextResponse.json({
    apiKeyPrefix: apiKey.slice(0, 12) + "...",
    apiKeyLength: apiKey.length,
    authCheck: authStatus,
    taskCreation: {
      status: createStatus,
      response: createBody.slice(0, 2000)
    }
  });
}
