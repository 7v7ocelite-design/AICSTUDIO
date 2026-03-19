const getEnv = (name: string): string => {
  const value = process.env[name];
  return value ?? "";
};

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
};

export const serverEnv = {
  serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  klingApiKey: getEnv("KLING_API_KEY"),
  runwayApiKey: getEnv("RUNWAY_API_KEY"),
  viduApiKey: getEnv("VIDU_API_KEY"),
  anthropicApiKey: getEnv("ANTHROPIC_API_KEY"),
  n8nWebhookUrl: getEnv("N8N_WEBHOOK_URL")
};

export const hasPublicSupabase = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

export const hasServerSupabase = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey && serverEnv.serviceRoleKey
);
