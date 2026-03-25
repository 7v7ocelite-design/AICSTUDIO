import type { ContentTier } from "@/lib/types";

/* ────────── Face identity preservation ────────── */

/** Prepended to all image-based prompts for face accuracy. */
export const FACE_PREFIX =
  "Maintain exact facial features, face shape, and identity from the reference image throughout the entire video. ";

/* ────────── Runway API settings ────────── */

export const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
export const RUNWAY_API_VERSION = "2024-11-06";

/* ────────── Per-endpoint config ────────── */

export interface RunwayProfile {
  endpoint: string;
  model: string;
  maxDuration: number;
  defaultRatio: string;
}

export const RUNWAY_PROFILES = {
  text_to_video: {
    endpoint: `${RUNWAY_API_BASE}/text_to_video`,
    model: "gen4.5",
    maxDuration: 10,
    defaultRatio: "1280:720",
  },
  image_to_video: {
    endpoint: `${RUNWAY_API_BASE}/image_to_video`,
    model: "gen4.5",
    maxDuration: 10,
    defaultRatio: "1280:720",
  },
} as const satisfies Record<string, RunwayProfile>;

export type RunwayMode = keyof typeof RUNWAY_PROFILES;

/* ────────── Engine priority by content tier ────────── */

export const ENGINE_SEQUENCES: Record<ContentTier, Array<"kling" | "runway" | "vidu">> = {
  premium: ["runway", "kling", "vidu"],
  social: ["vidu", "kling", "runway"],
  standard: ["kling", "vidu", "runway"],
};

/* ────────── Shared helpers ────────── */

/** Standard Runway HTTP headers. */
export const runwayHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-Runway-Version": RUNWAY_API_VERSION,
});

/**
 * Build the request body for any Runway mode.
 * For image_to_video: uses array promptImage format with position: "first"
 * for best face identity preservation.
 */
export function buildRunwayPayload(
  mode: RunwayMode,
  prompt: string,
  imageUrl?: string | null,
  opts?: { duration?: number; ratio?: string }
): Record<string, unknown> {
  const profile = RUNWAY_PROFILES[mode];

  const body: Record<string, unknown> = {
    model: profile.model,
    promptText: prompt.slice(0, 1000),
    duration: Math.min(opts?.duration ?? profile.maxDuration, profile.maxDuration),
    ratio: opts?.ratio ?? profile.defaultRatio,
  };

  if (mode === "image_to_video" && imageUrl) {
    body.promptImage = [{ uri: imageUrl, position: "first" }];
  }

  return body;
}

/** Prepend face-preservation instructions when an image reference is used. */
export function withFacePrefix(prompt: string, hasImage: boolean): string {
  return hasImage ? `${FACE_PREFIX}${prompt}` : prompt;
}
