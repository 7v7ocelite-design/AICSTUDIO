// NEXT_PUBLIC_ vars MUST be accessed as static literals for Next.js to inline them at build time.
// Using process.env[variable] does NOT work — Next.js cannot resolve dynamic keys.

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export const serverEnv = {
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  klingApiKey: process.env.KLING_API_KEY ?? "",
  runwayApiKey: process.env.RUNWAY_API_KEY ?? "",
  viduApiKey: process.env.VIDU_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? ""
};

export const hasPublicSupabase = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

export const hasServerSupabase = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey && serverEnv.serviceRoleKey
);
