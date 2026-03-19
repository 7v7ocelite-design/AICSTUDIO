import type { Athlete, Template } from "@/lib/types";

export const buildVideoPrompt = (athlete: Athlete, template: Template): string => {
  const style = athlete.style_preference ? `Style preference: ${athlete.style_preference}.` : "";
  const position = athlete.position ? `Position: ${athlete.position}.` : "";
  const classYear = athlete.class_year ? `Class year: ${athlete.class_year}.` : "";
  const state = athlete.state ? `Home state: ${athlete.state}.` : "";
  const platforms = template.platforms ? `Deliver for platforms: ${template.platforms}.` : "";
  const audio = template.audio_track ? `Use audio bed '${template.audio_track}'.` : "";

  return [
    "Create a polished AI lifestyle sports video.",
    `Subject descriptor: ${athlete.descriptor}.`,
    position,
    classYear,
    state,
    style,
    `Scene action: ${template.action}.`,
    `Location: ${template.location}.`,
    `Wardrobe direction: ${template.wardrobe}.`,
    `Lighting setup: ${template.lighting}.`,
    `Camera angle and movement: ${template.camera_angle}.`,
    `Template category: ${template.category} (${template.variant_name}).`,
    `Content tier: ${template.content_tier}.`,
    platforms,
    audio,
    "Output should feel authentic, aspirational, and suitable for NIL-style athlete branding."
  ]
    .filter(Boolean)
    .join(" ");
};
