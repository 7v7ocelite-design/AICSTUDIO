import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { RUNWAY_API_VERSION, RUNWAY_BASE_URL } from "@/lib/engines";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminSupabase();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["runway_api_key"]);
  const dbKey = settings?.find((s: any) => s.key === "runway_api_key")?.value;
  const apiKey = dbKey || serverEnv.runwayApiKey;

  if (!apiKey) {
    return NextResponse.json({ error: "No API key", envKey: !!serverEnv.runwayApiKey, dbKey: !!dbKey });
  }

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
        promptText: "A golden sunset over the ocean",
        duration: 5,
        ratio: "1280:720"
      })
    });

    const text = await res.text();
    return NextResponse.json({
      httpStatus: res.status,
      keySource: dbKey ? "db" : "env",
      keyPrefix: apiKey.slice(0, 12) + "...",
      response: text
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
