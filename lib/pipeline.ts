import { Settings, Template } from "@/lib/types";
import { delay } from "@/lib/utils";

export function getEngineForTier(contentTier: Template["content_tier"]) {
  if (contentTier === "premium") return "Runway Gen-4.5";
  if (contentTier === "social") return "Vidu Q3 Pro";
  return "Kling 3.0";
}

export function assemblePrompt(athleteDescriptor: string, template: Template) {
  return `${athleteDescriptor} ${template.action} in ${template.location}, wearing ${template.wardrobe}. ${template.lighting}. ${template.camera_angle}. Cinematic quality, photorealistic, 4K. No skeletal distortion, no extra limbs, no text overlays.`;
}

export async function validatePromptWithClaude(prompt: string, settings: Settings) {
  const apiKey = settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return prompt;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 300,
        system:
          "You are a prompt engineer for AI video generation. Review this prompt and return either 'APPROVED' if it will produce a high-quality, safe video, or return an improved version of the prompt if it can be optimized. Check for: vague language, missing physics details, potential artifact triggers (close-up hands/teeth), and brand safety issues.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      return prompt;
    }
    const json = (await response.json()) as { content?: Array<{ text?: string }> };
    const text = json.content?.[0]?.text?.trim();
    if (!text) return prompt;
    if (text.toUpperCase() === "APPROVED") return prompt;
    return text;
  } catch {
    return prompt;
  }
}

export async function generateVideo({
  tier,
  finalPrompt,
  referencePhotoUrl,
  settings,
}: {
  tier: Template["content_tier"];
  finalPrompt: string;
  referencePhotoUrl: string | null;
  settings: Settings;
}) {
  const engine = getEngineForTier(tier);
  const placeholderVideoUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

  if (tier === "premium") {
    // SIMULATED — replace with real API call
    await delay(3000);
    void {
      endpoint: "https://api.dev.runwayml.com/v1/image_to_video",
      payload: {
        promptImage: referencePhotoUrl,
        promptText: finalPrompt,
        model: "gen4",
        duration: 10,
        ratio: "16:9",
      },
      apiKey: settings.runway_api_key || process.env.RUNWAY_API_KEY,
    };
    return { engine, videoUrl: placeholderVideoUrl };
  }

  if (tier === "social") {
    // SIMULATED — replace with real API call
    await delay(3000);
    void {
      endpoint: "https://api.vidu.com/v1/video/generate",
      payload: {
        prompt: finalPrompt,
        reference_image: referencePhotoUrl,
        duration: 8,
        resolution: "1080p",
        with_audio: true,
      },
      apiKey: settings.vidu_api_key || process.env.VIDU_API_KEY,
    };
    return { engine, videoUrl: placeholderVideoUrl };
  }

  // SIMULATED — replace with real API call
  await delay(3000);
  void {
    endpoint: "https://api.klingai.com/v1/videos/text2video",
    payload: {
      prompt: finalPrompt,
      mode: "pro",
      duration: 10,
      aspect_ratio: "16:9",
      reference_image: referencePhotoUrl,
    },
    apiKey: settings.kling_api_key || process.env.KLING_API_KEY,
  };
  return { engine, videoUrl: placeholderVideoUrl };
}

export function simulateFaceScore() {
  return Math.random() * 15 + 85;
}
