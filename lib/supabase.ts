import { createClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __QONSULIN_PUBLIC_CONFIG__?: {
      supabaseUrl: string;
      supabasePublishableKey: string;
    };
  }
}

function cleanEnv(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "") || "";
}

function getSupabaseUrl() {
  const publicUrl = cleanEnv(
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : window.__QONSULIN_PUBLIC_CONFIG__?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const serverUrl = cleanEnv(process.env.SUPABASE_URL);

  // Browsers use localhost; Docker server code uses host.docker.internal.
  return typeof window === "undefined" ? serverUrl || publicUrl : publicUrl;
}

function getSupabasePublishableKey() {
  return (
    (typeof window !== "undefined" && window.__QONSULIN_PUBLIC_CONFIG__?.supabasePublishableKey) ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim().replace(/^['"]|['"]$/g, "") || "";
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
