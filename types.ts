export type JobStatus =
  | "queued"
  | "generating"
  | "processing"
  | "scoring"
  | "needs_review"
  | "approved"
  | "rejected"
  | "completed"
  | "failed";

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

export type RenderEngine = "runway" | "creatomate";

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
  render_engine: RenderEngine;
  creatomate_template_id: string | null;
  preview_video_url: string | null;
  thumbnail_url: string | null;
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
  output_filename?: string | null;
  runway_task_id?: string | null;
  creatomate_render_id?: string | null;
  output_format?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  reviewed_at: string | null;
  athlete?: Pick<Athlete, "name"> | null;
  template?: Pick<Template, "variant_name" | "category"> | null;
}

export type SettingKey =
  | "auto_approve_threshold"
  | "review_threshold"
  | "max_retries"
  | "kling_api_key"
  | "runway_api_key"
  | "vidu_api_key"
  | "anthropic_api_key"
  | "n8n_webhook_url"
  | "creatomate_api_key"
  | "elevenlabs_api_key";

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
  audioMessageCount?: number;
}

/* ───── Audio Messages ───── */

export type AudioSourceType = "recorded" | "uploaded" | "ai_generated";

export interface AudioMessage {
  id: string;
  athlete_id: string;
  title: string;
  source_type: AudioSourceType;
  audio_url: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  mime_type: string | null;
  transcript: string | null;
  voice_clone_id: string | null;
  status: "processing" | "ready" | "failed";
  created_at: string;
  athlete?: Pick<Athlete, "name"> | null;
}

export interface VoiceClone {
  id: string;
  athlete_id: string;
  elevenlabs_voice_id: string;
  voice_name: string;
  sample_count: number;
  status: "processing" | "ready" | "failed";
  created_at: string;
}
