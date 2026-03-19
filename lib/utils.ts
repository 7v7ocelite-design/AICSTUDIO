import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Athlete, Template } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function buildPrompt(athlete: Athlete, template: Template, customDirection?: string) {
  const fields = [
    `Athlete: ${athlete.name} (${athlete.sport})`,
    `Category: ${template.category} / ${template.variant_name}`,
    `Action: ${template.action}`,
    `Location: ${template.location}`,
    `Wardrobe: ${template.wardrobe}`,
    `Lighting: ${template.lighting}`,
    `Camera Angle: ${template.camera_angle}`,
    `Audio Track: ${template.audio_track}`,
    `Platform Targets: ${template.platforms.join(", ")}`
  ];

  if (customDirection?.trim()) {
    fields.push(`Creative Direction: ${customDirection.trim()}`);
  }

  return fields.join("\n");
}

export function generateVideoFilename(athleteName: string, category: string, location: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const sanitize = (value: string) =>
    value
      .replaceAll(/[^a-zA-Z0-9]+/g, "_")
      .replaceAll(/^_+|_+$/g, "")
      .slice(0, 28);

  return `${sanitize(athleteName)}_${sanitize(category)}_${sanitize(location)}_V01_${date}.mp4`;
}

export function getProviderByTier(tier: Template["content_tier"]) {
  if (tier === "premium") {
    return "Runway Gen-4.5";
  }

  if (tier === "standard") {
    return "Kling 3.0";
  }

  return "Vidu Q3 Pro";
}

export function normalizeTierFromCategory(category: string): Template["content_tier"] {
  const premiumCategories = new Set([
    "Luxury Travel",
    "Fine Dining",
    "Wellness & Mindfulness",
    "Motorsports & Cars",
    "Yacht & Water",
    "Business & Leadership"
  ]);

  return premiumCategories.has(category) ? "premium" : "standard";
}
