import type { ContentTier } from "@/lib/types";

export const FALLBACK_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
export const RUNWAY_VERSION = "2024-11-06";
export const RUNWAY_BASE_URL = RUNWAY_API_BASE;
export const RUNWAY_API_VERSION = RUNWAY_VERSION;

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

interface RunwayTaskCreateResponse {
  id?: string;
  taskId?: string;
  status?: string;
  error?: string;
  message?: string;
  failure?: string;
  failureCode?: string;
  task?: {
    id?: string;
    taskId?: string;
    status?: string;
  };
  [key: string]: unknown;
}

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const extractRunwayTaskId = (data: RunwayTaskCreateResponse): string | null => {
  const fromRoot = data.id ?? data.taskId;
  const fromTask = data.task?.id ?? data.task?.taskId;
  const taskId = fromRoot ?? fromTask;
  return typeof taskId === "string" && taskId.length > 0 ? taskId : null;
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
      model: "gen3a_turbo",
      promptText: prompt,
      duration: 10,
      ratio: "1280:720"
    })
  });

  const data = (await createRes.json()) as RunwayTaskCreateResponse;
  console.log("[RUNWAY] Full create response:", JSON.stringify(data));
  const taskId = extractRunwayTaskId(data);

  if (!createRes.ok || !taskId || taskId === ZERO_UUID) {
    throw new Error(
      `Runway create failed: ${
        (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        (typeof data.failure === "string" && data.failure) ||
        (typeof data.failureCode === "string" && data.failureCode) ||
        (taskId === ZERO_UUID ? "Invalid zero UUID task ID" : "") ||
        "Unknown error"
      }`
    );
  }

  return { taskId };
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

  const data = (await createRes.json()) as RunwayTaskCreateResponse;
  console.log("[RUNWAY] Full create response:", JSON.stringify(data));
  const taskId = extractRunwayTaskId(data);

  if (!createRes.ok || !taskId || taskId === ZERO_UUID) {
    throw new Error(
      `Runway image_to_video create failed: ${
        (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        (typeof data.failure === "string" && data.failure) ||
        (typeof data.failureCode === "string" && data.failureCode) ||
        (taskId === ZERO_UUID ? "Invalid zero UUID task ID" : "") ||
        "Unknown error"
      }`
    );
  }

  return { taskId };
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

const runwayHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-Runway-Version": RUNWAY_API_VERSION
});

/**
 * Creates a Runway task and returns immediately WITHOUT polling.
 * Used for async pattern where frontend polls via status route.
 */
export const createRunwayTaskOnly = async (
  apiKey: string,
  input: EngineInput
): Promise<{ taskId: string; engine: string }> => {
  const hasImage = input.referencePhotoUrl &&
    input.referencePhotoUrl.startsWith("http");

  const endpoint = hasImage
    ? `${RUNWAY_BASE_URL}/image_to_video`
    : `${RUNWAY_BASE_URL}/text_to_video`;

  const model = hasImage ? "gen4_turbo" : "gen3a_turbo";

  const body: Record<string, unknown> = {
    model,
    promptText: input.prompt.slice(0, 1000),
    duration: Math.min(input.durationSeconds ?? 10, 10),
    ratio: "1280:720"
  };

  if (hasImage) {
    body.promptImage = input.referencePhotoUrl;
  }

  console.log(`[RUNWAY] Creating task: ${endpoint} model=${model}`);

  const createRes = await fetch(endpoint, {
    method: "POST",
    headers: runwayHeaders(apiKey),
    body: JSON.stringify(body)
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Runway create task failed: HTTP ${createRes.status} — ${errText}`);
  }

  const created = (await createRes.json()) as RunwayTaskCreateResponse;
  console.log("[RUNWAY] Full create response:", JSON.stringify(created));
  const taskId = extractRunwayTaskId(created);
  if (!taskId) {
    throw new Error("Runway create task returned no task ID");
  }
  if (taskId === ZERO_UUID) {
    throw new Error("Runway create task returned invalid zero UUID task ID");
  }

  console.log(`[RUNWAY] Task created: ${taskId} — returning immediately (no poll)`);
  return { taskId, engine: "runway" };
};
