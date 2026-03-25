import { describe, expect, it } from "vitest";

import {
  FACE_PRESERVATION_PREFIX,
  RUNWAY_API_BASE,
  RUNWAY_API_VERSION,
  RUNWAY_BASE_URL,
  RUNWAY_DEFAULT_RATIO,
  RUNWAY_MODEL,
  RUNWAY_VERSION,
  buildRunwayPromptText,
  buildRunwayTaskPayload
} from "@/lib/runway-config";

describe("runway-config constants", () => {
  it("keeps API aliases consistent", () => {
    expect(RUNWAY_BASE_URL).toBe(RUNWAY_API_BASE);
    expect(RUNWAY_VERSION).toBe(RUNWAY_API_VERSION);
    expect(RUNWAY_MODEL).toBe("gen4.5");
    expect(RUNWAY_DEFAULT_RATIO).toBe("1280:720");
  });
});

describe("buildRunwayPromptText", () => {
  it("prepends face prefix for image flows", () => {
    const prompt = "athlete jogs through sunset city street";
    const full = buildRunwayPromptText(prompt, true);
    expect(full.startsWith(FACE_PRESERVATION_PREFIX)).toBe(true);
    expect(full).toContain(prompt);
  });

  it("does not prepend face prefix for text-only flows", () => {
    const prompt = "cinematic locker room reveal";
    const full = buildRunwayPromptText(prompt, false);
    expect(full.startsWith(FACE_PRESERVATION_PREFIX)).toBe(false);
    expect(full).toBe(prompt);
  });

  it("caps prompt length to 1000 chars", () => {
    const long = "x".repeat(2000);
    expect(buildRunwayPromptText(long, false).length).toBe(1000);
    expect(buildRunwayPromptText(long, true).length).toBe(1000);
  });
});

describe("buildRunwayTaskPayload", () => {
  it("builds text_to_video payload when no reference image", () => {
    const payload = buildRunwayTaskPayload({
      prompt: "walk through tunnel",
      referencePhotoUrl: null,
      durationSeconds: 8
    });

    expect(payload.endpointPath).toBe("text_to_video");
    expect(payload.hasReferenceImage).toBe(false);
    expect(payload.body.model).toBe("gen4.5");
    expect(payload.body.duration).toBe(8);
    expect(payload.body.ratio).toBe("1280:720");
    expect(payload.body.promptImage).toBeUndefined();
  });

  it("builds image_to_video payload with array promptImage and face prefix", () => {
    const payload = buildRunwayTaskPayload({
      prompt: "slow motion entrance",
      referencePhotoUrl: "https://cdn.example.com/athlete.jpg",
      durationSeconds: 20
    });

    expect(payload.endpointPath).toBe("image_to_video");
    expect(payload.hasReferenceImage).toBe(true);
    expect(payload.body.model).toBe("gen4.5");
    expect(payload.body.duration).toBe(10); // clamped max
    expect(payload.body.promptImage).toEqual([
      { uri: "https://cdn.example.com/athlete.jpg", position: "first" }
    ]);
    expect(String(payload.body.promptText).startsWith(FACE_PRESERVATION_PREFIX)).toBe(true);
  });

  it("clamps duration to minimum 1", () => {
    const payload = buildRunwayTaskPayload({
      prompt: "studio portrait",
      durationSeconds: -5
    });

    expect(payload.body.duration).toBe(1);
  });
});
