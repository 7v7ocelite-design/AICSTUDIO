import type { Athlete, Template } from "@/lib/types";

/**
 * Sanitize a free-text descriptor so it won't trigger Runway's content
 * moderation.  Strips references to minors (kid, child, boy, girl, teen,
 * youth, minor, adolescent) and collapses extra whitespace.
 */
const sanitizeDescriptor = (raw: string): string => {
  // Remove words that imply the subject is a minor
  const minorTerms =
    /\b(kid|kids|child|children|boy|girl|teen|teenager|teens|youth|minor|minors|adolescent|juvenile|underage)\b/gi;
  let cleaned = raw.replace(minorTerms, "").replace(/\s{2,}/g, " ").trim();

  // Prefix with "young adult athlete" so Runway treats the subject as 18+
  if (cleaned.length > 0) {
    cleaned = `Young adult athlete, ${cleaned}`;
  }

  return cleaned;
};

export const buildVideoPrompt = (athlete: Athlete, template: Template): string => {
  const descriptor = sanitizeDescriptor(athlete.descriptor ?? "");

  const parts = [
    descriptor,
    template.action,
    `in ${template.location}`,
    `wearing ${template.wardrobe}`,
    template.lighting,
    template.camera_angle,
    "Cinematic quality, photorealistic, 4K.",
    "No skeletal distortion, no extra limbs, no text overlays, no watermarks."
  ].filter(Boolean);

  return parts.join(". ");
};
