export interface Athlete {
  id: string;
  name: string;
  sport: string;
  team: string;
  headshot_url: string | null;
  reference_photos: string[];
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
  content_tier: "standard" | "premium" | "social";
  platforms: string[];
  created_at: string;
}

export interface Job {
  id: string;
  athlete_id: string;
  template_id: string;
  status: "pending" | "processing" | "completed" | "needs_review" | "approved" | "rejected" | "failed";
  face_score: number | null;
  output_url: string | null;
  file_name: string | null;
  prompt: string | null;
  engine: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  athlete?: Athlete;
  template?: Template;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface DashboardStats {
  total_athletes: number;
  total_templates: number;
  total_jobs: number;
  approved_jobs: number;
  pending_review: number;
  success_rate: number;
}

export interface GenerateRequest {
  athlete_id: string;
  template_id: string;
}

export type ContentTier = "standard" | "premium" | "social";

export const TIER_ENGINES: Record<ContentTier, string> = {
  premium: "Runway Gen-4.5",
  standard: "Kling 3.0",
  social: "Vidu Q3 Pro",
};

export const CATEGORIES = [
  "Luxury Travel",
  "Fine Dining",
  "Wellness & Mindfulness",
  "Motorsports & Cars",
  "Yacht & Water",
  "Business & Leadership",
  "Outdoor Adventure",
  "Urban Nightlife",
  "Fitness & Training",
  "Beach & Resort",
  "Fashion & Streetwear",
  "Studio Portrait",
  "Game Day",
  "Charity & Community",
  "Music & Entertainment",
] as const;

export type Category = (typeof CATEGORIES)[number];
