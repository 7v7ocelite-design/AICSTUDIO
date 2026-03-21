import Anthropic from "@anthropic-ai/sdk";

export const optimizePrompt = async (
  apiKey: string,
  rawPrompt: string,
  context: { athleteName: string; templateCategory: string; contentTier: string; platform: string }
): Promise<{ optimizedPrompt: string; suggestions: string[] }> => {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are an expert AI video prompt engineer for athlete lifestyle content. Optimize this prompt for Runway Gen-4.5.

Context: Athlete: ${context.athleteName} | Template: ${context.templateCategory} | Tier: ${context.contentTier} | Platform: ${context.platform || "Instagram/TikTok"}

Raw prompt:
"${rawPrompt}"

Rules:
1. Keep the core scene, action, and wardrobe
2. Make the visual language more cinematic (texture, atmosphere, color grading)
3. Under 200 words
4. For social tier: vertical framing, fast energy. Premium: cinematic depth, shallow focus
5. End with: "Photorealistic, 4K. No skeletal distortion, no extra limbs, no text overlays."

Return ONLY a JSON object (no markdown, no code fences):
{"optimizedPrompt": "the improved prompt", "suggestions": ["tip 1", "tip 2"]}`
    }]
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);
    return { optimizedPrompt: parsed.optimizedPrompt || rawPrompt, suggestions: parsed.suggestions || [] };
  } catch {
    console.error("[CLAUDE] Failed to parse optimizer response");
    return { optimizedPrompt: rawPrompt, suggestions: [] };
  }
};

export const scoreVideo = async (
  apiKey: string,
  context: { prompt: string; athleteName: string; athleteDescriptor: string; templateCategory: string; videoUrl: string; engineUsed: string; live: boolean }
): Promise<{ score: number; breakdown: Record<string, number | null>; notes: string }> => {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are a QC analyst for AI-generated athlete lifestyle videos. Score this generation.

Prompt: "${context.prompt}"
Athlete: ${context.athleteName} (${context.athleteDescriptor || "no descriptor"})
Template: ${context.templateCategory}
Engine: ${context.engineUsed} (${context.live ? "LIVE API" : "MOCK — sample video"})

${!context.live ? "IMPORTANT: MOCK generation with sample video. Does NOT match prompt. Max score: 50." : ""}

Score 0-100 each: prompt_adherence, cinematic_quality, brand_safety, athlete_likeness (null if no ref photo), platform_fit.

Return ONLY JSON (no markdown): {"score": <weighted avg>, "breakdown": {"prompt_adherence": <n>, "cinematic_quality": <n>, "brand_safety": <n>, "athlete_likeness": <n or null>, "platform_fit": <n>}, "notes": "1-2 sentence assessment"}`
    }]
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);
    return { score: parsed.score ?? 75, breakdown: parsed.breakdown ?? {}, notes: parsed.notes ?? "" };
  } catch {
    console.error("[CLAUDE] Failed to parse QC response");
    return { score: 75, breakdown: {}, notes: "QC parse failed" };
  }
};
