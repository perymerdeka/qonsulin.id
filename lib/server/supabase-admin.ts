import { createClient } from "@supabase/supabase-js";

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim().replace(/^['"]|['"]$/g, "");
}

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim().replace(/^['"]|['"]$/g, "");
}

export function hasSupabaseAdminEnv() {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

export function getSupabaseAdminClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
