import type { Athlete, Template, ContentTier } from "./database.types";

export function assemblePrompt(athlete: Athlete, template: Template): string {
  return `${athlete.descriptor} ${template.action} in ${template.location}, wearing ${template.wardrobe}. ${template.lighting}. ${template.camera_angle}. Cinematic quality, photorealistic, 4K. No skeletal distortion, no extra limbs, no text overlays.`;
}

export function generateFileName(
  athleteName: string,
  category: string,
  location: string,
  version: number = 1,
  date?: string
): string {
  const clean = (s: string) =>
    s.replace(/[^a-zA-Z0-9]/g, "").replace(/\s+/g, "");
  const d = date || new Date().toISOString().split("T")[0];
  const v = `V${String(version).padStart(2, "0")}`;
  return `${clean(athleteName)}_${clean(category)}_${clean(location)}_${v}_${d}.mp4`;
}

export function getEngineForTier(tier: ContentTier): string {
  switch (tier) {
    case "premium":
      return "Runway Gen-4.5";
    case "standard":
      return "Kling 3.0";
    case "social":
      return "Vidu Q3 Pro";
  }
}

export function getCostEstimate(tier: ContentTier): number {
  switch (tier) {
    case "premium":
      return 0.5;
    case "standard":
      return 0.25;
    case "social":
      return 0.15;
  }
}

export async function validatePromptWithClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return prompt;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system:
          "You are a prompt engineer for AI video generation. Review this prompt and return either 'APPROVED' if it will produce a high-quality, safe video, or return an improved version of the prompt if it can be optimized. Check for: vague language, missing physics details, potential artifact triggers (close-up hands/teeth), and brand safety issues.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return prompt;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || prompt;

    if (text.trim().toUpperCase() === "APPROVED") {
      return prompt;
    }

    return text;
  } catch {
    return prompt;
  }
}

// SIMULATED — replace with real API call
export async function generateVideoKling(
  _prompt: string,
  _referenceImageUrl: string | null
): Promise<string> {
  await new Promise((r) => setTimeout(r, 3000));
  return `https://storage.example.com/generated-videos/kling_${Date.now()}.mp4`;
}

// SIMULATED — replace with real API call
export async function generateVideoRunway(
  _prompt: string,
  _referenceImageUrl: string | null
): Promise<string> {
  await new Promise((r) => setTimeout(r, 3000));
  return `https://storage.example.com/generated-videos/runway_${Date.now()}.mp4`;
}

// SIMULATED — replace with real API call
export async function generateVideoVidu(
  _prompt: string,
  _referenceImageUrl: string | null
): Promise<string> {
  await new Promise((r) => setTimeout(r, 3000));
  return `https://storage.example.com/generated-videos/vidu_${Date.now()}.mp4`;
}

export async function generateVideo(
  tier: ContentTier,
  prompt: string,
  referenceImageUrl: string | null
): Promise<string> {
  switch (tier) {
    case "premium":
      return generateVideoRunway(prompt, referenceImageUrl);
    case "standard":
      return generateVideoKling(prompt, referenceImageUrl);
    case "social":
      return generateVideoVidu(prompt, referenceImageUrl);
  }
}

export function computeFaceScore(): number {
  // SIMULATED — replace with real face-embedding comparison
  return Math.random() * 15 + 85;
}

export async function fireWebhook(
  webhookUrl: string,
  payload: {
    event: string;
    job_id: string;
    athlete_name: string;
    video_url: string | null;
    face_score: number | null;
    engine: string;
  }
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Webhook failure should not block the pipeline
  }
}
