export const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
export const RUNWAY_API_VERSION = "2024-11-06";
export const RUNWAY_MODEL = "gen4.5";
export const RUNWAY_MAX_PROMPT_CHARS = 1000;
export const RUNWAY_MAX_DURATION_SECONDS = 10;
export const RUNWAY_DEFAULT_DURATION_SECONDS = 10;
export const RUNWAY_DEFAULT_RATIO = "1280:720";

export const FACE_PRESERVATION_PREFIX =
  "Maintain exact facial features, face shape, and identity from the reference image throughout the entire video. ";

export const FALLBACK_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

// Backward-compatible aliases used by existing modules.
export const RUNWAY_BASE_URL = RUNWAY_API_BASE;
export const RUNWAY_VERSION = RUNWAY_API_VERSION;
export const FACE_PREFIX = FACE_PRESERVATION_PREFIX;

export type RunwayTaskMode = "text_to_video" | "image_to_video";

export interface RunwayPayloadInput {
  prompt: string;
  referencePhotoUrl?: string | null;
  durationSeconds?: number;
}

export interface RunwayTaskPayload {
  endpointPath: RunwayTaskMode;
  hasReferenceImage: boolean;
  body: Record<string, unknown>;
}

const clampDuration = (value?: number): number => {
  const duration = Math.floor(value ?? RUNWAY_DEFAULT_DURATION_SECONDS);
  return Math.max(1, Math.min(RUNWAY_MAX_DURATION_SECONDS, duration));
};

export const buildRunwayPromptText = (prompt: string, includeFacePrefix: boolean): string => {
  const base = includeFacePrefix ? `${FACE_PRESERVATION_PREFIX}${prompt}` : prompt;
  return base.slice(0, RUNWAY_MAX_PROMPT_CHARS);
};

export const buildRunwayTaskPayload = (input: RunwayPayloadInput): RunwayTaskPayload => {
  const hasReferenceImage = Boolean(
    input.referencePhotoUrl && input.referencePhotoUrl.startsWith("http")
  );

  const promptText = buildRunwayPromptText(input.prompt, hasReferenceImage);

  const body: Record<string, unknown> = {
    model: RUNWAY_MODEL,
    promptText,
    duration: clampDuration(input.durationSeconds),
    ratio: RUNWAY_DEFAULT_RATIO
  };

  if (hasReferenceImage && input.referencePhotoUrl) {
    body.promptImage = [{ uri: input.referencePhotoUrl, position: "first" }];
  }

  return {
    endpointPath: hasReferenceImage ? "image_to_video" : "text_to_video",
    hasReferenceImage,
    body
  };
};

export const buildRunwayCreatePayload = (input: RunwayPayloadInput): Record<string, unknown> => {
  return buildRunwayTaskPayload(input).body;
};
