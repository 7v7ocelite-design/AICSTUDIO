export type ContentTier = "standard" | "premium" | "social";

export type JobStatus =
  | "queued"
  | "generating"
  | "approved"
  | "needs_review"
  | "rejected"
  | "failed";

export interface Athlete {
  id: string;
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "OL" | "IOL" | "OT" | "DL" | "EDGE" | "LB" | "CB" | "S";
  class_year: number;
  state: string;
  descriptor: string;
  style_preference: "streetwear" | "formal" | "athleisure" | "casual" | "editorial";
  reference_photo_url: string | null;
  consent_signed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  category: string;
  variant: string;
  action: string;
  location: string;
  wardrobe: string;
  lighting: string;
  camera_angle: string;
  audio_track: string;
  target_platforms: string[];
  content_tier: ContentTier;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  athlete_id: string;
  template_id: string;
  status: JobStatus;
  retry_count: number;
  face_score: number | null;
  video_url: string | null;
  engine_used: string | null;
  file_name: string;
  assembled_prompt: string | null;
  final_prompt: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: number;
  kling_api_key: string;
  runway_api_key: string;
  vidu_api_key: string;
  anthropic_api_key: string;
  auto_approve_threshold: string;
  review_threshold: string;
  max_retries: number;
  n8n_webhook_url: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalAthletes: number;
  videosToday: number;
  videosWeek: number;
  videosMonth: number;
  approvalRate: number;
  avgFaceScore: number;
  estimatedCostMonth: number;
}
