import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep startup resilient in cloud/CI where env may be injected later.
  console.warn("Supabase URL or anon key missing from environment variables.");
}

export const supabase = createClient(
  supabaseUrl ?? "https://udayfshvdiblulpbboir.supabase.co",
  supabaseAnonKey ?? "missing-anon-key"
);

export const getServerSupabase = () =>
  createClient(
    supabaseUrl ?? "https://udayfshvdiblulpbboir.supabase.co",
    supabaseServiceKey ?? supabaseAnonKey ?? "missing-service-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
