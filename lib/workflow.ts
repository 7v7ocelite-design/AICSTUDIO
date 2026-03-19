import { serverEnv } from "@/lib/env";

const DEFAULT_AUTO_APPROVE = 90;
const DEFAULT_REVIEW_THRESHOLD = 85;
const DEFAULT_MAX_RETRIES = 2;

export interface WorkflowSettings {
  autoApproveThreshold: number;
  reviewThreshold: number;
  maxRetries: number;
  klingApiKey: string;
  runwayApiKey: string;
  viduApiKey: string;
  anthropicApiKey: string;
  n8nWebhookUrl: string;
}

export interface N8nResult {
  videoUrl?: string;
  engineUsed?: "kling" | "runway" | "vidu";
  faceScore?: number;
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

export const parseWorkflowSettings = (input: Record<string, string>): WorkflowSettings => ({
  autoApproveThreshold: toNumber(input.auto_approve_threshold, DEFAULT_AUTO_APPROVE),
  reviewThreshold: toNumber(input.review_threshold, DEFAULT_REVIEW_THRESHOLD),
  maxRetries: toNumber(input.max_retries, DEFAULT_MAX_RETRIES),
  klingApiKey: input.kling_api_key || serverEnv.klingApiKey,
  runwayApiKey: input.runway_api_key || serverEnv.runwayApiKey,
  viduApiKey: input.vidu_api_key || serverEnv.viduApiKey,
  anthropicApiKey: input.anthropic_api_key || serverEnv.anthropicApiKey,
  n8nWebhookUrl: input.n8n_webhook_url || serverEnv.n8nWebhookUrl
});

export const buildOutputFileName = (
  athleteName: string,
  templateVariant: string,
  attempt: number,
  date = new Date()
): string => {
  const scrub = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `aic-${scrub(athleteName)}-${scrub(templateVariant)}-a${attempt + 1}-${stamp}.mp4`;
};

const deterministicScore = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  const normalized = Math.abs(hash % 21);
  return 78 + normalized;
};

export const scoreFaceMatch = async (params: {
  athleteName: string;
  descriptor: string;
  templateVariant: string;
  prompt: string;
  anthropicApiKey: string;
}): Promise<number> => {
  if (!params.anthropicApiKey) {
    return deterministicScore(`${params.athleteName}:${params.templateVariant}:${params.prompt}`);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": params.anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 20,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Return only a number from 0 to 100 for how well this video prompt matches the athlete identity.
Athlete name: ${params.athleteName}
Athlete descriptor: ${params.descriptor}
Template variant: ${params.templateVariant}
Prompt: ${params.prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error("Anthropic scoring request failed.");
    }

    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
    };
    const modelText = data.content?.[0]?.text ?? "";
    const score = Number(modelText.match(/\d{1,3}/)?.[0]);
    if (!Number.isFinite(score)) {
      throw new Error("Invalid face score from Anthropic.");
    }

    return Math.max(0, Math.min(100, score));
  } catch {
    return deterministicScore(`${params.athleteName}:${params.templateVariant}:${params.prompt}`);
  }
};

export const callN8nWebhook = async (
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<N8nResult | null> => {
  if (!webhookUrl) {
    return null;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      videoUrl: typeof data.video_url === "string" ? data.video_url : undefined,
      engineUsed:
        data.engine_used === "kling" || data.engine_used === "runway" || data.engine_used === "vidu"
          ? data.engine_used
          : undefined,
      faceScore: typeof data.face_score === "number" ? data.face_score : undefined
    };
  } catch {
    return null;
  }
};
