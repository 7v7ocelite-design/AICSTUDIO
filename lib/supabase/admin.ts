import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hasServerSupabase, publicEnv, serverEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

export const getAdminSupabase = (): SupabaseClient => {
  if (!hasServerSupabase) {
    throw new Error("Missing Supabase environment variables for server-side access.");
  }

  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
};
