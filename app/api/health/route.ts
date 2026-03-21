import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface HealthResult {
  status: "success" | "failed" | "not_set";
  message?: string;
  latency?: number;
}

const checkRunway = async (apiKey: string): Promise<HealthResult> => {
  if (!apiKey) return { status: "not_set" };
  const start = Date.now();
  try {
    const res = await fetch("https://api.dev.runwayml.com/v1/tasks/00000000-0000-0000-0000-000000000000", {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" }
    });
    const latency = Date.now() - start;
    if (res.status === 400) return { status: "success", message: `Connected (${latency}ms)`, latency };
    if (res.status === 401 || res.status === 403) return { status: "failed", message: "Invalid API key" };
    return { status: "failed", message: `Unexpected: ${res.status}` };
  } catch (err) {
    return { status: "failed", message: err instanceof Error ? err.message : "Connection error" };
  }
};

const checkClaude = async (apiKey: string): Promise<HealthResult> => {
  if (!apiKey) return { status: "not_set" };
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1, messages: [{ role: "user", content: "ping" }] })
    });
    const latency = Date.now() - start;
    if (res.ok || res.status === 200) return { status: "success", message: `Connected (${latency}ms)`, latency };
    if (res.status === 429) return { status: "success", message: `Connected — rate limited (${latency}ms)`, latency };
    if (res.status === 401) return { status: "failed", message: "Invalid API key" };
    return { status: "failed", message: `Error ${res.status}` };
  } catch (err) {
    return { status: "failed", message: err instanceof Error ? err.message : "Connection error" };
  }
};

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();
    const { data: rows } = await supabase.from("settings").select("key, value");
    const s: Record<string, string> = {};
    for (const r of rows ?? []) s[r.key] = r.value;

    const [runway, claude] = await Promise.all([
      checkRunway(s["runway_api_key"] ?? ""),
      checkClaude(s["anthropic_api_key"] ?? "")
    ]);

    return NextResponse.json({
      runway,
      claude,
      kling: s["kling_api_key"] ? { status: "success", message: "Key saved (not yet integrated)" } : { status: "not_set" },
      vidu: s["vidu_api_key"] ? { status: "success", message: "Key saved (not yet integrated)" } : { status: "not_set" },
      n8n: s["n8n_webhook_url"] ? { status: "success", message: "URL configured" } : { status: "not_set" },
      checked_at: new Date().toISOString()
    });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
