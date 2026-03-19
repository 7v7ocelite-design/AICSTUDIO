import { TEMPLATE_SEED_DATA } from "@/lib/seed/templates";
import { Athlete, Job, Settings, Template } from "@/lib/types";

interface MemoryStore {
  athletes: Athlete[];
  templates: Template[];
  jobs: Job[];
  settings: Settings;
}

declare global {
  var __aicStore: MemoryStore | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function createSeedTemplates(): Template[] {
  const timestamp = nowIso();
  return TEMPLATE_SEED_DATA.map((template) => ({
    ...template,
    id: crypto.randomUUID(),
    created_at: timestamp,
    updated_at: timestamp,
  }));
}

function defaultSettings(): Settings {
  const timestamp = nowIso();
  return {
    id: 1,
    kling_api_key: "",
    runway_api_key: "",
    vidu_api_key: "",
    anthropic_api_key: "",
    auto_approve_threshold: "90",
    review_threshold: "85",
    max_retries: 2,
    n8n_webhook_url: "",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function defaultAthletes(): Athlete[] {
  const timestamp = nowIso();
  return [
    {
      id: crypto.randomUUID(),
      name: "Jayden Daniels",
      position: "QB",
      class_year: 2026,
      state: "LA",
      descriptor: "Elite quarterback, athletic build, short curly hair, confident expression",
      style_preference: "athleisure",
      reference_photo_url: null,
      consent_signed: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: crypto.randomUUID(),
      name: "Malik Washington",
      position: "WR",
      class_year: 2027,
      state: "TX",
      descriptor: "Explosive wide receiver, lean athletic frame, focused demeanor",
      style_preference: "streetwear",
      reference_photo_url: null,
      consent_signed: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

function createStore(): MemoryStore {
  return {
    athletes: defaultAthletes(),
    templates: createSeedTemplates(),
    jobs: [],
    settings: defaultSettings(),
  };
}

export function getMemoryStore() {
  if (!globalThis.__aicStore) {
    globalThis.__aicStore = createStore();
  }
  return globalThis.__aicStore;
}
