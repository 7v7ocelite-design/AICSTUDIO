import type { ContentTier } from "@/lib/types";

const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
const RUNWAY_API_VERSION = "2024-11-06";
const RUNWAY_BASE_URL = "https://api.dev.runwayml.com/v1";
const RUNWAY_POLL_INTERVAL_MS = 5000;
const RUNWAY_MAX_POLLS = 60;

export interface EngineResult {
  engine: "kling" | "runway" | "vidu";
  videoUrl: string;
  live: boolean;
  raw?: unknown;
}

interface EngineInput {
  prompt: string;
  referencePhotoUrl?: string | null;
  durationSeconds?: number;
}

const runwayHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-Runway-Version": RUNWAY_API_VERSION
});

const pollRunwayTask = async (taskId: string, apiKey: string): Promise<{ videoUrl: string; raw: unknown }> => {
  for (let i = 0; i < RUNWAY_MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, RUNWAY_POLL_INTERVAL_MS));

    const res = await fetch(`${RUNWAY_BASE_URL}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_API_VERSION
      }
    });

    if (!res.ok) {
      throw new Error(`Runway task poll failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      status: string;
      output?: string[];
      failure?: string;
      failureCode?: string;
    };

    console.log(`[RUNWAY] Poll ${i + 1}: status=${data.status}`);

    if (data.status === "SUCCEEDED" && data.output?.length) {
      return { videoUrl: data.output[0], raw: data };
    }

    if (data.status === "FAILED") {
      throw new Error(`Runway generation failed: ${data.failure ?? data.failureCode ?? "unknown"}`);
    }
  }

  throw new Error("Runway generation timed out after 5 minutes");
};

const generateWithRunway = async (
  apiKey: string,
  input: EngineInput
): Promise<EngineResult> => {
  const hasImage = input.referencePhotoUrl &&
    input.referencePhotoUrl.startsWith("http");

  const endpoint = hasImage
    ? `${RUNWAY_BASE_URL}/image_to_video`
    : `${RUNWAY_BASE_URL}/text_to_video`;

  const model = hasImage ? "gen4_turbo" : "gen4.5";

  const body: Record<string, unknown> = {
    model,
    promptText: input.prompt.slice(0, 1000),
    duration: Math.min(input.durationSeconds ?? 10, 10),
    ratio: "1280:720"
  };

  if (hasImage) {
    body.promptImage = input.referencePhotoUrl;
  }

  console.log(`[RUNWAY] Calling ${endpoint} with model=${model}, prompt=${input.prompt.slice(0, 120)}...`);

  const createRes = await fetch(endpoint, {
    method: "POST",
    headers: runwayHeaders(apiKey),
    body: JSON.stringify(body)
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Runway create task failed: HTTP ${createRes.status} — ${errText}`);
  }

  const created = (await createRes.json()) as { id?: string };
  if (!created.id) {
    throw new Error("Runway create task returned no task ID");
  }

  console.log(`[RUNWAY] Task created: ${created.id}`);

  const result = await pollRunwayTask(created.id, apiKey);
  console.log(`[RUNWAY] Task succeeded, video URL: ${result.videoUrl.slice(0, 80)}...`);
  return { engine: "runway", videoUrl: result.videoUrl, live: true, raw: result.raw };
};

const mockResult = (engine: "kling" | "runway" | "vidu"): EngineResult => ({
  engine,
  videoUrl: FALLBACK_VIDEO_URL,
  live: false
});

export const pickEngineForTier = (tier: ContentTier, attempt: number): "kling" | "runway" | "vidu" => {
  const sequences: Record<ContentTier, Array<"kling" | "runway" | "vidu">> = {
    premium: ["runway", "kling", "vidu"],
    social: ["vidu", "kling", "runway"],
    standard: ["kling", "vidu", "runway"]
  };

  const sequence = sequences[tier];
  return sequence[Math.min(attempt, sequence.length - 1)];
};

export const generateWithEngine = async (
  engine: "kling" | "runway" | "vidu",
  apiKeys: { kling: string; runway: string; vidu: string },
  input: EngineInput
): Promise<EngineResult> => {
  console.log(`[ENGINE] engine=${engine}, hasRunwayKey=${!!apiKeys.runway}, hasKlingKey=${!!apiKeys.kling}, hasViduKey=${!!apiKeys.vidu}`);

  if (engine === "runway" && apiKeys.runway) {
    try {
      return await generateWithRunway(apiKeys.runway, input);
    } catch (err) {
      console.error(`[ENGINE] Runway failed, falling back to mock:`, err instanceof Error ? err.message : err);
      return mockResult("runway");
    }
  }

  if (engine === "kling" && apiKeys.kling) {
    console.log(`[ENGINE] Kling API not yet implemented, returning mock`);
  }

  if (engine === "vidu" && apiKeys.vidu) {
    console.log(`[ENGINE] Vidu API not yet implemented, returning mock`);
  }

  console.log(`[ENGINE] Using mock fallback for ${engine}`);
  return mockResult(engine);
};
