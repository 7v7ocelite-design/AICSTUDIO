import type { ContentTier } from "@/lib/types";

const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
const RUNWAY_API_VERSION = "2024-11-06";
const RUNWAY_BASE_URL = "https://api.dev.runwayml.com/v1";
const RUNWAY_POLL_INTERVAL_MS = 5000;
const RUNWAY_MAX_POLLS = 60;

export interface EngineResult {
  engine: "kling" | "runway" | "vidu";
  videoUrl: string;
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

  const body: Record<string, unknown> = {
    model: "gen4_turbo",
    promptText: input.prompt.slice(0, 1000),
    duration: Math.min(input.durationSeconds ?? 10, 10),
    ratio: "1280:720"
  };

  if (hasImage) {
    body.promptImage = input.referencePhotoUrl;
  }

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

  const result = await pollRunwayTask(created.id, apiKey);
  return { engine: "runway", videoUrl: result.videoUrl, raw: result.raw };
};

const readVideoUrl = (data: Record<string, unknown>): string | null => {
  const candidates = ["video_url", "videoUrl", "url", "output_url", "result_url"];
  for (const key of candidates) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

const callEngine = async (
  engine: "kling" | "runway" | "vidu",
  endpoint: string,
  apiKey: string,
  input: EngineInput
): Promise<EngineResult> => {
  if (!apiKey) {
    return { engine, videoUrl: FALLBACK_VIDEO_URL };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: input.prompt,
        reference_photo_url: input.referencePhotoUrl,
        duration_seconds: input.durationSeconds ?? 8
      })
    });

    if (!response.ok) {
      throw new Error(`${engine} request failed with status ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      engine,
      videoUrl: readVideoUrl(data) ?? FALLBACK_VIDEO_URL,
      raw: data
    };
  } catch {
    return { engine, videoUrl: FALLBACK_VIDEO_URL };
  }
};

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
  if (engine === "runway" && apiKeys.runway) {
    try {
      return await generateWithRunway(apiKeys.runway, input);
    } catch {
      return { engine: "runway", videoUrl: FALLBACK_VIDEO_URL };
    }
  }

  if (engine === "kling") {
    return callEngine(engine, "https://api.klingai.com/v1/videos/generate", apiKeys.kling, input);
  }

  if (engine === "runway") {
    return { engine: "runway", videoUrl: FALLBACK_VIDEO_URL };
  }

  return callEngine(engine, "https://api.vidu.com/v1/video/generate", apiKeys.vidu, input);
};
