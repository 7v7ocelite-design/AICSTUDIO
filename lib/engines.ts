import type { ContentTier } from "@/lib/types";

export const FALLBACK_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
export const RUNWAY_VERSION = "2024-11-06";

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

export interface RunwayTaskPollResult {
  status?: string;
  output?: string[];
  progress?: number | null;
  failure?: string;
  failureCode?: string;
  [key: string]: unknown;
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
  engine: "kling" | "vidu",
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

export const generateWithRunway = async (
  apiKey: string,
  prompt: string
): Promise<{ taskId: string } | { videoUrl: string }> => {
  if (!apiKey) {
    return { videoUrl: FALLBACK_VIDEO_URL };
  }

  const createRes = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_VERSION
    },
    body: JSON.stringify({
      model: "gen4.5",
      promptText: prompt,
      duration: 10,
      ratio: "1280:720"
    })
  });

  const created = (await createRes.json()) as Record<string, unknown>;

  if (!createRes.ok || typeof created.id !== "string") {
    throw new Error(
      `Runway create failed: ${
        (typeof created.error === "string" && created.error) ||
        (typeof created.message === "string" && created.message) ||
        "Unknown error"
      }`
    );
  }

  return { taskId: created.id };
};

export const generateImageToVideoWithRunway = async (
  apiKey: string,
  prompt: string,
  imageUrl: string
): Promise<{ taskId: string } | { videoUrl: string }> => {
  if (!apiKey) {
    return { videoUrl: FALLBACK_VIDEO_URL };
  }

  const createRes = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_VERSION
    },
    body: JSON.stringify({
      model: "gen4_turbo",
      promptImage: imageUrl,
      promptText: prompt,
      duration: 10,
      ratio: "1280:720"
    })
  });

  const created = (await createRes.json()) as Record<string, unknown>;

  if (!createRes.ok || typeof created.id !== "string") {
    throw new Error(
      `Runway image_to_video create failed: ${
        (typeof created.error === "string" && created.error) ||
        (typeof created.message === "string" && created.message) ||
        "Unknown error"
      }`
    );
  }

  return { taskId: created.id };
};

export const pollRunwayTask = async (apiKey: string, taskId: string): Promise<RunwayTaskPollResult> => {
  const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": RUNWAY_VERSION
    }
  });

  const payload = (await response.json()) as RunwayTaskPollResult;
  if (!response.ok) {
    throw new Error(
      `Runway poll failed: ${
        (typeof payload.error === "string" && payload.error) ||
        (typeof payload.failure === "string" && payload.failure) ||
        "Unknown error"
      }`
    );
  }

  return payload;
};

export const generateWithEngine = async (
  engine: "kling" | "vidu",
  apiKeys: { kling: string; vidu: string },
  input: EngineInput
): Promise<EngineResult> => {
  if (engine === "kling") {
    return callEngine(engine, "https://api.klingai.com/v1/videos/generate", apiKeys.kling, input);
  }

  return callEngine(engine, "https://api.vidu.com/v1/video/generate", apiKeys.vidu, input);
};
