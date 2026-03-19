-- Athletes table
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('QB','RB','WR','TE','OL','IOL','OT','DL','EDGE','LB','CB','S')),
  class_year INTEGER NOT NULL CHECK (class_year >= 2025 AND class_year <= 2030),
  state TEXT NOT NULL,
  descriptor TEXT NOT NULL,
  style_preference TEXT NOT NULL DEFAULT 'casual' CHECK (style_preference IN ('streetwear','formal','athleisure','casual','editorial')),
  reference_photo_url TEXT,
  consent_signed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  variant TEXT NOT NULL,
  action TEXT NOT NULL,
  location TEXT NOT NULL,
  wardrobe TEXT NOT NULL,
  lighting TEXT NOT NULL,
  camera_angle TEXT NOT NULL,
  audio_track TEXT NOT NULL,
  platforms TEXT NOT NULL,
  content_tier TEXT NOT NULL CHECK (content_tier IN ('premium','standard','social')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  assembled_prompt TEXT NOT NULL,
  validated_prompt TEXT,
  video_url TEXT,
  face_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','scoring','approved','needs_review','rejected','failed')),
  engine_used TEXT NOT NULL,
  file_name TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table (key-value)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_athlete ON jobs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tier ON templates(content_tier);

-- Storage buckets (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reference-photos', 'reference-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-videos', 'generated-videos', true);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('auto_approve_threshold', '90'),
  ('review_threshold', '85'),
  ('max_retries', '2'),
  ('n8n_webhook_url', ''),
  ('kling_api_key', ''),
  ('runway_api_key', ''),
  ('vidu_api_key', ''),
  ('anthropic_api_key', '')
ON CONFLICT (key) DO NOTHING;
