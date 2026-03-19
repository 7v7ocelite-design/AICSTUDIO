export type ContentTier = "premium" | "standard" | "social";
export type JobStatus =
  | "queued"
  | "processing"
  | "approved"
  | "needs_review"
  | "rejected";

export interface Athlete {
  id: string;
  name: string;
  sport: string;
  bio: string | null;
  reference_photo_url: string | null;
  created_at: string;
  updated_at: string;
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
  audio_track: string;
  content_tier: ContentTier;
  platforms: string[];
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  athlete_id: string;
  template_id: string;
  prompt: string;
  status: JobStatus;
  face_score: number | null;
  filename: string | null;
  video_url: string | null;
  content_tier: ContentTier;
  progress: number;
  provider: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  athlete?: Pick<Athlete, "id" | "name" | "sport">;
  template?: Pick<Template, "id" | "category" | "variant_name">;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalAthletes: number;
  totalTemplates: number;
  totalJobs: number;
  approvedJobs: number;
  needsReviewJobs: number;
  queuedJobs: number;
}

export interface GenerateRequestPayload {
  athleteId: string;
  templateId: string;
  customDirection?: string;
}

export interface PipelineProgressEvent {
  step:
    | "initializing"
    | "prompt_assembly"
    | "validation"
    | "rendering"
    | "face_scoring"
    | "routing"
    | "webhook"
    | "completed"
    | "error";
  message: string;
  progress: number;
  status?: JobStatus;
  jobId?: string;
  filename?: string;
  videoUrl?: string;
  faceScore?: number;
  provider?: string;
}

export interface Database {
  public: {
    Tables: {
      athletes: {
        Row: Athlete;
        Insert: Partial<Omit<Athlete, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<Athlete, "id" | "created_at" | "updated_at">>;
      };
      templates: {
        Row: Template;
        Insert: Partial<Omit<Template, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<Template, "id" | "created_at" | "updated_at">>;
      };
      jobs: {
        Row: Job;
        Insert: Partial<Omit<Job, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<Job, "id" | "created_at" | "updated_at">>;
      };
      settings: {
        Row: Setting;
        Insert: Partial<Omit<Setting, "id" | "created_at" | "updated_at">>;
        Update: Partial<Omit<Setting, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
