import type { Athlete } from "@/lib/types";

const CREATOMATE_API = "https://api.creatomate.com/v1";

export interface CreatomateRenderInput {
  templateId: string;
  modifications: Record<string, string>;
}

export interface CreatomateRenderResult {
  renderId: string;
  status: string;
  url?: string;
  progress?: number;
}

/**
 * Start a Creatomate render with dynamic modifications.
 * Returns immediately with render ID for polling.
 */
export const startCreatomateRender = async (
  apiKey: string,
  input: CreatomateRenderInput
): Promise<{ renderId: string }> => {
  const response = await fetch(`${CREATOMATE_API}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      template_id: input.templateId,
      modifications: input.modifications
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Creatomate render failed: ${err}`);
  }

  const data = await response.json();
  const render = Array.isArray(data) ? data[0] : data;

  if (!render?.id) {
    throw new Error("Creatomate returned no render ID");
  }

  return { renderId: render.id };
};

/**
 * Poll Creatomate for render status.
 * Statuses: planned | rendering | succeeded | failed
 */
export const pollCreatomateRender = async (
  apiKey: string,
  renderId: string
): Promise<CreatomateRenderResult> => {
  const response = await fetch(`${CREATOMATE_API}/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Creatomate poll failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    renderId: data.id,
    status: data.status,
    url: data.url ?? undefined,
    progress: typeof data.progress === "number" ? data.progress : undefined
  };
};

/**
 * Build Creatomate template modifications from athlete data.
 *
 * Keys must match element names in your Creatomate template designs.
 * Standardized names:
 *   "Athlete Name", "Athlete Position", "Class Year",
 *   "State", "Athlete Photo", "Style"
 */
export const buildCreatomateModifications = (
  athlete: Pick<
    Athlete,
    "name" | "position" | "class_year" | "state" | "reference_photo_url" | "style_preference"
  >,
  extraData?: Record<string, string>
): Record<string, string> => {
  const mods: Record<string, string> = {
    "Athlete Name": athlete.name,
    "Athlete Position": athlete.position ?? "",
    "Class Year": athlete.class_year ?? "",
    State: athlete.state ?? "",
    Style: athlete.style_preference ?? ""
  };

  if (athlete.reference_photo_url) {
    mods["Athlete Photo"] = athlete.reference_photo_url;
  }

  if (extraData) {
    Object.assign(mods, extraData);
  }

  return mods;
};
