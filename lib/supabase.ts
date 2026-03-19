import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasSupabaseAdminConfig = Boolean(supabaseUrl && supabaseServiceRole);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const supabaseAdmin = hasSupabaseAdminConfig
  ? createClient(supabaseUrl!, supabaseServiceRole!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
