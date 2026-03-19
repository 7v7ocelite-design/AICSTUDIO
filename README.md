# AiC Studio

AI-powered video generation platform for athletes. Built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor
   - Copy `.env.local.example` to `.env.local` and fill in your keys:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_key
     ```

3. **Create storage buckets:**
   - In Supabase Dashboard, create two public buckets: `reference-photos` and `generated-videos`
   - Or run the seed script: `npm run seed`

4. **Seed templates:**
   ```bash
   npm run seed
   ```
   This populates 45 prompt templates (15 categories x 3 variants).

5. **Run development server:**
   ```bash
   npm run dev
   ```

## Architecture

- `/src/app/` — Next.js App Router pages and API routes
- `/src/components/` — Shared UI components
- `/src/lib/` — Supabase client, types, pipeline logic, constants
- `/src/scripts/` — Database seed scripts
- `/supabase/migrations/` — SQL schema

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Stats overview, recent activity |
| `/generate` | Main video generation control center |
| `/athletes` | Athlete management (CRUD) |
| `/templates` | Template browser (45 pre-seeded) |
| `/queue` | Job queue with approve/reject/regenerate |
| `/settings` | API keys, thresholds, automation |

## Pipeline

1. Prompt Assembly (athlete descriptor + template)
2. Claude AI Validation (Anthropic API)
3. Video Generation (routed by tier: Runway/Kling/Vidu)
4. Face Similarity Scoring
5. Auto-routing (approve/review/reject)
6. Webhook Notification (n8n)

All video API calls are currently **simulated** with 3-second delays. Connect real API keys in Settings to activate.
