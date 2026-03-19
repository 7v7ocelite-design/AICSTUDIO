# AiC Studio

Next.js App Router + TypeScript control center for athlete video generation pipelines.

## Features Included

- Dark themed UI with responsive/collapsible sidebar
- Pages: `/dashboard`, `/generate`, `/athletes`, `/templates`, `/queue`, `/settings`
- Full API surface under `app/api/**`
- `/api/generate` SSE pipeline with:
  - Prompt assembly
  - Claude prompt validation (Anthropic API when key is configured)
  - Content tier routing (`standard`, `premium`, `social`)
  - **Simulated** provider calls (3 second delay) with placeholder URL
  - Simulated face score and auto-routing logic
  - Optional webhook callback
- 45 prompt templates included in seed data (`lib/seed/templates.ts`)
- Supabase shared client (`lib/supabase.ts`)
- Supabase migration with buckets:
  - `reference-photos` (public read)
  - `generated-videos` (public read)

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
KLING_API_KEY=
RUNWAY_API_KEY=
VIDU_API_KEY=
```

The app will still run without Supabase env vars by falling back to in-memory data.

## Database / Storage Setup

Run the SQL migration:

- `supabase/migrations/202603191730_init.sql`

This creates tables and both public storage buckets.

## Seed Templates

45 templates are auto-seeded on first template read when DB is connected.

Manual seed command:

```bash
npm run seed:templates
```
