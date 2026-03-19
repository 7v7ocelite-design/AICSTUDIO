export type ContentTier = "premium" | "standard" | "social";
export type JobStatus = "pending" | "generating" | "scoring" | "approved" | "needs_review" | "rejected" | "failed";
export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "IOL" | "OT" | "DL" | "EDGE" | "LB" | "CB" | "S";
export type StylePreference = "streetwear" | "formal" | "athleisure" | "casual" | "editorial";

export interface Athlete {
  id: string;
  name: string;
  position: Position;
  class_year: number;
  state: string;
  descriptor: string;
  style_preference: StylePreference;
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
  platforms: string;
  content_tier: ContentTier;
  created_at: string;
}

export interface Job {
  id: string;
  athlete_id: string;
  template_id: string;
  assembled_prompt: string;
  validated_prompt: string | null;
  video_url: string | null;
  face_score: number | null;
  status: JobStatus;
  engine_used: string;
  file_name: string;
  retry_count: number;
  cost_estimate: number;
  created_at: string;
  updated_at: string;
  athlete?: Athlete;
  template?: Template;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      athletes: {
        Row: Athlete;
        Insert: Omit<Athlete, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Athlete, "id" | "created_at" | "updated_at">>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, "id" | "created_at">;
        Update: Partial<Omit<Template, "id" | "created_at">>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Job, "id" | "created_at" | "updated_at">>;
      };
      settings: {
        Row: Setting;
        Insert: Omit<Setting, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Setting, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
