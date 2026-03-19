"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export const getBrowserSupabase = (): SupabaseClient => {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (!browserClient) {
    browserClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
};
