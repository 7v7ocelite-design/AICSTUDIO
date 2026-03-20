export type JobStatus =
  | "queued"
  | "generating"
  | "scoring"
  | "needs_review"
  | "approved"
  | "rejected";

export type ContentTier = "standard" | "premium" | "social";

export interface Athlete {
  id: string;
  name: string;
  position: string | null;
  class_year: string | null;
  state: string | null;
  descriptor: string;
  style_preference: string | null;
  reference_photo_url: string | null;
  consent_signed: boolean;
  videos_generated: number;
  created_at: string;
}

export interface Template {
  id: string;
  category: string;
  variant_name: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string | null;
  content_tier: ContentTier;
  platforms: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  athlete_id: string | null;
  template_id: string | null;
  status: JobStatus;
  assembled_prompt: string | null;
  face_score: number | null;
  video_url: string | null;
  engine_used: string | null;
  file_name: string | null;
  output_filename: string | null;
  retry_count: number;
  created_at: string;
  reviewed_at: string | null;
  athlete?: Pick<Athlete, "name"> | null;
  template?: Pick<Template, "variant_name" | "category" | "location"> | null;
}

export type SettingKey =
  | "auto_approve_threshold"
  | "review_threshold"
  | "max_retries"
  | "kling_api_key"
  | "runway_api_key"
  | "vidu_api_key"
  | "anthropic_api_key"
  | "n8n_webhook_url";

export interface Setting {
  id: string;
  key: SettingKey;
  value: string;
}

export interface DashboardBootstrap {
  athletes: Athlete[];
  templates: Template[];
  jobs: Job[];
  settings: Record<string, string>;
}
