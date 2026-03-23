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
- `POST /api/jobs/generate` — create generation job (Runway returns task immediately)
- `POST /api/jobs/animate` — create image-to-video job (Runway returns task immediately)
- `GET /api/jobs/[id]/status` — poll Runway task status and update job row

## Automation Pipeline

Runway generation is implemented with background polling to support Vercel Hobby function limits:

1. `POST /api/jobs/generate` (or `/animate`) creates a Runway task and stores `runway_task_id`
2. Route returns quickly with job `status: "processing"` (no long polling inside request)
3. Frontend polls `GET /api/jobs/{id}/status` every 10 seconds
4. Status route checks Runway and updates job to `completed` or `failed`

For existing Supabase projects, ensure these columns exist:

```sql
alter table jobs add column if not exists runway_task_id text;
alter table jobs add column if not exists error_message text;
```

## Deployment

Deploy to Vercel and configure the same environment variables in project settings.
