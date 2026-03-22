import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hasServerSupabase, publicEnv, serverEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

export const getAdminSupabase = (): SupabaseClient => {
  if (!hasServerSupabase) {
        // Log exactly which vars are missing so we can debug in Vercel logs
        console.error("[ADMIN_SUPABASE] Missing env vars:", {
                NEXT_PUBLIC_SUPABASE_URL: publicEnv.supabaseUrl ? `SET (${publicEnv.supabaseUrl.slice(0, 30)}...)` : "EMPTY",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.supabaseAnonKey ? `SET (${publicEnv.supabaseAnonKey.slice(0, 20)}...)` : "EMPTY",
                SUPABASE_SERVICE_ROLE_KEY: serverEnv.serviceRoleKey ? `SET (${serverEnv.serviceRoleKey.slice(0, 20)}...)` : "EMPTY",
        });
    throw new Error("Missing Supabase environment variables for server-side access.");
  }

  if (!adminClient) {
        console.log("[ADMIN_SUPABASE] Creating client for:", publicEnv.supabaseUrl);
    adminClient = createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
};
