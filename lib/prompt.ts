import type { Athlete, Template } from "@/lib/types";

export const buildVideoPrompt = (athlete: Athlete, template: Template): string => {
  const parts = [
    athlete.descriptor,
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
