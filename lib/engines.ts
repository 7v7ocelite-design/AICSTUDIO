import type { ContentTier } from "@/lib/types";

const FALLBACK_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

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
  if (engine === "kling") {
    return callEngine(engine, "https://api.klingai.com/v1/videos/generate", apiKeys.kling, input);
  }

  if (engine === "runway") {
    return callEngine(engine, "https://api.dev.runwayml.com/v1/text_to_video", apiKeys.runway, input);
  }

  return callEngine(engine, "https://api.vidu.com/v1/video/generate", apiKeys.vidu, input);
};
