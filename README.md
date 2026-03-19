# AiC Content Studio

AiC Content Studio is a full-stack Next.js 14 dashboard for fully automated AI lifestyle video production for Athletes in Control.

Operators can:

1. Sign in with Supabase Auth
2. Select an athlete
3. Select a template
4. Click **Generate Finished Video**
5. Receive a completed AI-generated output with no manual handoff

## Tech Stack

- Next.js 14 (App Router, `app/`)
- TypeScript
- Tailwind CSS (dark dashboard theme)
- Supabase (Postgres + Auth + Storage)
- Vercel-ready deployment

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
KLING_API_KEY=
RUNWAY_API_KEY=
VIDU_API_KEY=
ANTHROPIC_API_KEY=
N8N_WEBHOOK_URL=
```

## Supabase Setup

Run the schema at `supabase/schema.sql`.

Create buckets:

- `reference-photos` (public)
- `generated-videos` (public)

Enable Email/Password auth providers in Supabase for operator logins.

## Local Development

```bash
npm install
npm run dev
```

## API Routes

- `GET /api/bootstrap` — dashboard data (athletes, templates, jobs, settings)
- `POST /api/athletes` — create athlete + optional reference photo upload
- `POST /api/templates` — create prompt template
- `POST /api/jobs/generate` — fully automated generation pipeline

## Automation Pipeline

`POST /api/jobs/generate` performs:

1. Prompt assembly from athlete + template metadata
2. Engine selection by content tier (`kling`, `runway`, `vidu`)
3. Optional n8n webhook orchestration
4. Video generation via provider adapter (with stable fallback URL)
5. Face-match scoring using Anthropic (or deterministic fallback if key is missing)
6. Auto-approval / retry / rejection logic based on Supabase settings table
7. Video upload into Supabase Storage and job finalization

## Deployment

Deploy to Vercel and configure the same environment variables in project settings.
