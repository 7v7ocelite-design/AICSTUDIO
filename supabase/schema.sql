create extension if not exists pgcrypto;

create table if not exists athletes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  position text,
  class_year text,
  state text,
  descriptor text not null,
  style_preference text,
  reference_photo_url text,
  consent_signed boolean default false,
  videos_generated integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists templates (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  variant_name text not null,
  action text not null,
  location text not null,
  wardrobe text not null,
  lighting text not null,
  camera_angle text not null,
  audio_track text,
  content_tier text not null check (content_tier in ('standard', 'premium', 'social')),
  platforms text,
  created_at timestamp with time zone default now(),
  unique (category, variant_name)
);

create table if not exists jobs (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references athletes(id) on delete cascade,
  template_id uuid references templates(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'generating', 'scoring', 'needs_review', 'approved', 'rejected')),
  assembled_prompt text,
  face_score float,
  video_url text,
  engine_used text,
  file_name text,
  output_filename text,
  retry_count integer default 0,
  created_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone
);

create table if not exists settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text not null
);

insert into settings (key, value)
values
  ('auto_approve_threshold', '90'),
  ('review_threshold', '85'),
  ('max_retries', '2'),
  ('kling_api_key', ''),
  ('runway_api_key', ''),
  ('vidu_api_key', ''),
  ('anthropic_api_key', ''),
  ('n8n_webhook_url', '')
on conflict (key) do nothing;
