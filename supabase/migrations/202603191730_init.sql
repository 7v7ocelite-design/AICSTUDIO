create extension if not exists pgcrypto;

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null check (position in ('QB','RB','WR','TE','OL','IOL','OT','DL','EDGE','LB','CB','S')),
  class_year integer not null check (class_year between 2025 and 2030),
  state text not null,
  descriptor text not null,
  style_preference text not null check (style_preference in ('streetwear','formal','athleisure','casual','editorial')),
  reference_photo_url text,
  consent_signed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  variant text not null,
  action text not null,
  location text not null,
  wardrobe text not null,
  lighting text not null,
  camera_angle text not null,
  audio_track text not null,
  target_platforms text[] not null default '{}',
  content_tier text not null check (content_tier in ('standard','premium','social')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, variant)
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  kling_api_key text not null default '',
  runway_api_key text not null default '',
  vidu_api_key text not null default '',
  anthropic_api_key text not null default '',
  auto_approve_threshold text not null default '90',
  review_threshold text not null default '85',
  max_retries integer not null default 2,
  n8n_webhook_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1)
on conflict (id) do nothing;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete restrict,
  status text not null check (status in ('queued','generating','approved','needs_review','rejected','failed')) default 'queued',
  retry_count integer not null default 0,
  face_score numeric(5,2),
  video_url text,
  engine_used text,
  file_name text not null,
  assembled_prompt text,
  final_prompt text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

alter table public.athletes enable row level security;
alter table public.templates enable row level security;
alter table public.settings enable row level security;
alter table public.jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='athletes' and policyname='public read athletes'
  ) then
    create policy "public read athletes" on public.athletes for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='templates' and policyname='public read templates'
  ) then
    create policy "public read templates" on public.templates for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='settings' and policyname='public read settings'
  ) then
    create policy "public read settings" on public.settings for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='jobs' and policyname='public read jobs'
  ) then
    create policy "public read jobs" on public.jobs for select using (true);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values
  ('reference-photos', 'reference-photos', true),
  ('generated-videos', 'generated-videos', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public read reference photos'
  ) then
    create policy "public read reference photos"
      on storage.objects
      for select
      using (bucket_id = 'reference-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public read generated videos'
  ) then
    create policy "public read generated videos"
      on storage.objects
      for select
      using (bucket_id = 'generated-videos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated upload reference photos'
  ) then
    create policy "authenticated upload reference photos"
      on storage.objects
      for insert
      with check (bucket_id = 'reference-photos' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated upload generated videos'
  ) then
    create policy "authenticated upload generated videos"
      on storage.objects
      for insert
      with check (bucket_id = 'generated-videos' and auth.role() = 'authenticated');
  end if;
end $$;
