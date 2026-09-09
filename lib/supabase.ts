import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim().replace(/^['"]|['"]$/g, "");
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

let cachedSupabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (cachedSupabaseClient) return cachedSupabaseClient;

  const url = getSupabaseUrl();
  const anonKey = getSupabasePublishableKey();

  if (!url || !anonKey) return null;

  cachedSupabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return cachedSupabaseClient;
}

let cachedPublicClient: ReturnType<typeof createClient> | null = null;

export function getSupabasePublicClient() {
  if (cachedPublicClient) return cachedPublicClient;

  const url = getSupabaseUrl();
  const anonKey = getSupabasePublishableKey();

  if (!url || !anonKey) return null;

  cachedPublicClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedPublicClient;
}
