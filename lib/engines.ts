import type { ContentTier } from "@/lib/types";
import {
  RUNWAY_API_BASE,
  RUNWAY_API_VERSION,
  RUNWAY_PROFILES,
  ENGINE_SEQUENCES,
  runwayHeaders,
  buildRunwayPayload,
  withFacePrefix,
  type RunwayMode,
} from "@/lib/runway-config";

export const FALLBACK_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

// Re-exports for backwards compatibility with existing imports
export { RUNWAY_API_BASE, RUNWAY_API_VERSION, RUNWAY_PROFILES };
export const RUNWAY_VERSION = RUNWAY_API_VERSION;
export const RUNWAY_BASE_URL = RUNWAY_API_BASE;

/* ────────── Types ────────── */

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
  task?: { id?: string; taskId?: string; status?: string };
  [key: string]: unknown;
}

/* ────────── Internal helpers ────────── */

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const extractRunwayTaskId = (data: RunwayTaskCreateResponse): string | null => {
  const fromRoot = data.id ?? data.taskId;
  const fromTask = data.task?.id ?? data.task?.taskId;
  const taskId = fromRoot ?? fromTask;
  return typeof taskId === "string" && taskId.length > 0 ? taskId : null;
};

const readVideoUrl = (data: Record<string, unknown>): string | null => {
  for (const key of ["video_url", "videoUrl", "url", "output_url", "result_url"]) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
};

const extractRunwayError = (data: RunwayTaskCreateResponse, prefix: string): string => {
  return `${prefix}: ${
    (typeof data.error === "string" && data.error) ||
    (typeof data.message === "string" && data.message) ||
    (typeof data.failure === "string" && data.failure) ||
    (typeof data.failureCode === "string" && data.failureCode) ||
    "Unknown error"
  }`;
};

/**
 * Core: create a Runway task for any mode.
 * Handles model selection, prompt shaping, and face prefix automatically
 * via the centralized config in runway-config.ts.
 */
const createRunwayTask = async (
  apiKey: string,
  mode: RunwayMode,
  prompt: string,
  imageUrl?: string | null,
  opts?: { duration?: number; ratio?: string }
): Promise<{ taskId: string }> => {
  const profile = RUNWAY_PROFILES[mode];
  const finalPrompt = withFacePrefix(prompt, mode === "image_to_video" && !!imageUrl);
  const body = buildRunwayPayload(mode, finalPrompt, imageUrl, opts);

  console.log(`[RUNWAY] Creating task: ${profile.endpoint} model=${profile.model}`);

  const createRes = await fetch(profile.endpoint, {
    method: "POST",
    cache: "no-store",
    headers: runwayHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Runway ${mode} create failed: HTTP ${createRes.status} — ${errText}`);
  }

  const data = (await createRes.json()) as RunwayTaskCreateResponse;
  console.log("[RUNWAY] Full create response:", JSON.stringify(data));
  const taskId = extractRunwayTaskId(data);

  if (!taskId) throw new Error(extractRunwayError(data, `Runway ${mode} create failed`));
  if (taskId === ZERO_UUID) throw new Error("Runway create task returned invalid zero UUID task ID");

  console.log(`[RUNWAY] Task created: ${taskId}`);
  return { taskId };
};

/* ────────── Public API ────────── */

export const pickEngineForTier = (tier: ContentTier, attempt: number): "kling" | "runway" | "vidu" => {
  const sequence = ENGINE_SEQUENCES[tier];
  return sequence[Math.min(attempt, sequence.length - 1)];
};

/** Text-to-video: create Runway task and return task ID. */
export const generateWithRunway = async (
  apiKey: string,
  prompt: string
): Promise<{ taskId: string } | { videoUrl: string }> => {
  if (!apiKey) return { videoUrl: FALLBACK_VIDEO_URL };
  return createRunwayTask(apiKey, "text_to_video", prompt);
};

/** Image-to-video: create Runway task with image reference + face prefix. */
export const generateImageToVideoWithRunway = async (
  apiKey: string,
  prompt: string,
  imageUrl: string
): Promise<{ taskId: string } | { videoUrl: string }> => {
  if (!apiKey) return { videoUrl: FALLBACK_VIDEO_URL };
  return createRunwayTask(apiKey, "image_to_video", prompt, imageUrl);
};

/** Poll an existing Runway task for status/output. */
export const pollRunwayTask = async (apiKey: string, taskId: string): Promise<RunwayTaskPollResult> => {
  const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
    cache: "no-store",
    headers: runwayHeaders(apiKey),
  });

  const payload = (await response.json()) as RunwayTaskPollResult;
  if (!response.ok) {
    throw new Error(
      `Runway poll failed: ${
        (typeof payload.failure === "string" && payload.failure) ||
        "Unknown error"
      }`
    );
  }

  return payload;
};

/** Non-Runway engine call (Kling / Vidu). */
export const generateWithEngine = async (
  engine: "kling" | "vidu",
  apiKeys: { kling: string; vidu: string },
  input: EngineInput
): Promise<EngineResult> => {
  const endpoints: Record<"kling" | "vidu", string> = {
    kling: "https://api.klingai.com/v1/videos/generate",
    vidu: "https://api.vidu.com/v1/video/generate",
  };

  const apiKey = apiKeys[engine];
  if (!apiKey) return { engine, videoUrl: FALLBACK_VIDEO_URL };

  try {
    const response = await fetch(endpoints[engine], {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        prompt: input.prompt,
        reference_photo_url: input.referencePhotoUrl,
        duration_seconds: input.durationSeconds ?? 8,
      }),
    });

    if (!response.ok) throw new Error(`${engine} request failed with status ${response.status}`);
    const data = (await response.json()) as Record<string, unknown>;
    return { engine, videoUrl: readVideoUrl(data) ?? FALLBACK_VIDEO_URL, raw: data };
  } catch {
    return { engine, videoUrl: FALLBACK_VIDEO_URL };
  }
};

/**
 * Creates a Runway task and returns immediately WITHOUT polling.
 * Used for async pattern where frontend polls via /api/jobs/[id]/status.
 */
export const createRunwayTaskOnly = async (
  apiKey: string,
  input: EngineInput
): Promise<{ taskId: string; engine: string }> => {
  const hasImage = input.referencePhotoUrl && input.referencePhotoUrl.startsWith("http");
  const mode: RunwayMode = hasImage ? "image_to_video" : "text_to_video";

  const result = await createRunwayTask(apiKey, mode, input.prompt, input.referencePhotoUrl, {
    duration: input.durationSeconds,
  });

  console.log(`[RUNWAY] Task created: ${result.taskId} — returning immediately (no poll)`);
  return { taskId: result.taskId, engine: "runway" };
};
