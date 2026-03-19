# AGENTS.md

## Cursor Cloud specific instructions

### Overview

AiC Content Studio is a Next.js 14 (App Router) + TypeScript + Tailwind CSS application for automated AI lifestyle video production. It uses Supabase (Postgres + Auth + Storage) as its sole infrastructure dependency. See `README.md` for full architecture and API route details.

### Running the application

Standard commands from `package.json`:
- `npm run dev` — start Next.js dev server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type checking

### Local Supabase

The app requires Supabase for auth, database, and storage. For local development:

1. Docker must be running (with `fuse-overlayfs` storage driver and `iptables-legacy` in cloud VMs)
2. Run `npx supabase start` to launch local Supabase containers
3. Get credentials with `npx supabase status -o env` — use `API_URL` for `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SERVICE_ROLE_KEY` for `SUPABASE_SERVICE_ROLE_KEY`
4. Apply schema: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/schema.sql`
5. Create storage buckets via Supabase Storage API (POST to `/storage/v1/bucket` with service role key):
   - `reference-photos` (public)
   - `generated-videos` (public)

### Key gotchas

- **`NEXT_PUBLIC_*` env vars**: Must be accessed via direct `process.env.NEXT_PUBLIC_*` syntax (not through a helper function) for Next.js to inline them in the client bundle. The `lib/env.ts` file handles this correctly.
- **Email confirmations**: Local Supabase has `enable_confirmations = false` in `supabase/config.toml`, so sign-up works immediately without email verification.
- **AI API keys are optional**: All external AI APIs (Kling, Runway, Vidu, Anthropic) gracefully fall back to placeholder/deterministic values when keys are not configured. The app is fully functional as a UI/pipeline demo without any real API keys.
- **Dev server restart required after `.env.local` changes**: `NEXT_PUBLIC_*` vars are bundled at compile time, so the dev server must be restarted after modifying `.env.local`.
