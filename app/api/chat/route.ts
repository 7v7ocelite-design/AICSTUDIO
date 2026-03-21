import { NextRequest, NextResponse } from "next/server";

import { mapApiError, readJsonBody, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";

interface ChatBody {
  message: string;
  athleteId: string | null;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  "Jet Arrival": ["jet", "plane", "tarmac", "airport", "flying", "arrival", "landing"],
  "Penthouse Lifestyle": ["penthouse", "skyline", "balcony", "rooftop living", "luxury apartment"],
  "Luxury Car": ["car", "driving", "sports car", "suv", "garage", "convertible"],
  "Red Carpet": ["red carpet", "awards", "premiere", "tuxedo", "gala"],
  "Yacht Life": ["yacht", "boat", "ocean", "water", "marina", "sailing"],
  "Rooftop Cityscape": ["rooftop", "city", "skyline", "downtown", "urban"],
  "Private Gym": ["gym", "training", "workout", "fitness", "weights", "box jump"],
  "Studio Portrait": ["studio", "portrait", "headshot", "photo shoot"],
  "Game Day Tunnel": ["tunnel", "game day", "stadium", "field", "football"],
  "Press Conference": ["press", "conference", "podium", "media", "interview"],
  "Charity Event": ["charity", "community", "kids", "donation", "give back"],
  "Street Style": ["street", "urban", "sidewalk", "graffiti", "city walk"],
  "Vacation Resort": ["vacation", "beach", "resort", "pool", "tropical"],
  "Recording Studio": ["recording", "studio", "music", "microphone", "booth"],
  "Brand Campaign": ["brand", "campaign", "sponsor", "product", "commercial", "deal"]
};

const matchTemplate = (message: string): string | null => {
  const lower = message.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }
  return bestMatch;
};

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const body = await readJsonBody<ChatBody>(request);
    const supabase = getAdminSupabase();

    const [{ data: settingsRows }, { data: athlete }, { data: templates }] = await Promise.all([
      supabase.from("settings").select("key, value"),
      body.athleteId
        ? supabase.from("athletes").select("*").eq("id", body.athleteId).single()
        : Promise.resolve({ data: null }),
      supabase.from("templates").select("id, category, variant_name, action, location, wardrobe, lighting, camera_angle, content_tier").order("category", { ascending: true })
    ]);

    const settings = (settingsRows ?? []).reduce<Record<string, string>>((a, c) => {
      a[c.key] = c.value;
      return a;
    }, {});
    const anthropicKey = settings.anthropic_api_key;

    if (anthropicKey) {
      const systemPrompt = `You are the AiC Content Studio creative assistant. You help operators create AI-generated lifestyle video content for athlete clients.

CONTEXT:
- Athletes in Control (AiC) is a player relations agency for ~80 Southern California high school football recruits (Class 2027-2028)
- The studio produces lifestyle videos across 15 categories: Jet Arrival, Penthouse Lifestyle, Luxury Car, Red Carpet, Yacht Life, Rooftop Cityscape, Private Gym, Studio Portrait, Game Day Tunnel, Press Conference, Charity Event, Street Style, Vacation Resort, Recording Studio, Brand Campaign
- Each category has 3 variants (V1/V2/V3). All currently route through Runway Gen-4.5.
- Videos build athlete personal brands, attract college recruiters, and generate spec content for local business sponsorship pitches.

${athlete ? `CURRENT ATHLETE: ${athlete.name}${athlete.position ? `, ${athlete.position}` : ""}${athlete.class_year ? `, Class of ${athlete.class_year}` : ""}${athlete.state ? `, ${athlete.state}` : ""}
Physical descriptor: ${athlete.descriptor}
${athlete.style_preference ? `Style preference: ${athlete.style_preference}` : ""}
Consent signed: ${athlete.consent_signed ? "Yes" : "NO — cannot generate until signed"}` : "No athlete selected yet."}

AVAILABLE TEMPLATES (${templates?.length ?? 0}):
${(templates ?? []).slice(0, 15).map((t: Record<string, unknown>) => `- ${t.category} ${t.variant_name} (${t.content_tier}): "${t.action}" in ${t.location}`).join("\n")}
... and ${Math.max(0, (templates?.length ?? 0) - 15)} more

PROMPT QUALITY RULES (V5 spec):
- Structure: "{descriptor} {action} in {location}, wearing {wardrobe}. {lighting}. {camera}. Cinematic quality, photorealistic, 4K."
- Always end with: "No skeletal distortion, no extra limbs, no text overlays, no watermarks."
- Avoid hands, teeth, and extreme close-ups (top artifact zones)
- Front-load the visual hook in first 2 seconds
- Include physics-grounding: gravity, fabric movement, hair motion

YOUR ROLE: Help craft optimized prompts. When suggesting a generation, output a JSON block:
\`\`\`json
{"template_category":"Jet Arrival","variant":"V3","prompt":"the full prompt text","tier":"premium"}
\`\`\`
Be concise, creative, and enthusiastic. Keep responses under 200 words.`;

      const messages = [
        ...body.history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user" as const, content: body.message }
      ];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 600,
          system: systemPrompt,
          messages
        })
      });

      if (res.ok) {
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        const text = data.content?.[0]?.text ?? "I couldn't generate a response. Try again.";

        let recommendation: Record<string, string> | null = null;
        const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            const matchedTemplate = (templates ?? []).find(
              (t: Record<string, unknown>) =>
                (t.category as string).toLowerCase() === (parsed.template_category ?? "").toLowerCase() &&
                (parsed.variant ? (t.variant_name as string).toLowerCase() === parsed.variant.toLowerCase() : true)
            );
            recommendation = {
              template_id: matchedTemplate?.id as string ?? "",
              template_label: `${parsed.template_category} – ${parsed.variant ?? "V1"}`,
              prompt: parsed.prompt ?? "",
              tier: parsed.tier ?? "standard"
            };
          } catch { /* ignore parse errors */ }
        }

        return NextResponse.json({ message: text.replace(/```json[\s\S]*?```/g, "").trim(), recommendation });
      }
    }

    // Fallback: keyword matching (no Claude key)
    const matched = matchTemplate(body.message);
    const matchedTemplates = matched
      ? (templates ?? []).filter((t: Record<string, unknown>) => t.category === matched)
      : [];
    const bestTemplate = matchedTemplates[0] as Record<string, unknown> | undefined;

    let fallbackMsg: string;
    let recommendation: Record<string, string> | null = null;

    if (bestTemplate && athlete) {
      const prompt = [
        athlete.descriptor,
        bestTemplate.action,
        `in ${bestTemplate.location}`,
        `wearing ${bestTemplate.wardrobe}`,
        bestTemplate.lighting,
        bestTemplate.camera_angle,
        "Cinematic quality, photorealistic, 4K.",
        "No skeletal distortion, no extra limbs, no text overlays, no watermarks."
      ].filter(Boolean).join(". ");

      recommendation = {
        template_id: bestTemplate.id as string,
        template_label: `${bestTemplate.category} – ${bestTemplate.variant_name}`,
        prompt,
        tier: bestTemplate.content_tier as string
      };
      fallbackMsg = `I matched your idea to **${bestTemplate.category} – ${bestTemplate.variant_name}** (${bestTemplate.content_tier}). Here's the assembled prompt for ${athlete.name}:\n\n"${prompt}"\n\nClick Generate to create this video.`;
    } else if (matched) {
      fallbackMsg = `That sounds like a **${matched}** template. Select an athlete first so I can build the full prompt.`;
    } else {
      fallbackMsg = `I'm not sure which template fits best. Try describing the scene — mention a location (jet, gym, rooftop, beach) or activity (arriving, training, posing) and I'll match it.\n\n💡 Connect your Claude AI key in Settings for smarter suggestions.`;
    }

    return NextResponse.json({ message: fallbackMsg, recommendation });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
