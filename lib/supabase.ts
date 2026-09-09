import { createClient } from "@supabase/supabase-js";

const VERIFIED_SUPABASE_URL = "https://jphmtaqjswogxscdylwx.supabase.co";
const VERIFIED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaG10YXFqc3dvZ3hzY2R5bHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMTIwNjYsImV4cCI6MjA5NzU4ODA2Nn0.0kVTDXsOJeHFBEqyVyAJmgKvSNiWztNX6iIsylMc3Z0";

function getSupabaseUrl() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");

  return url || VERIFIED_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim().replace(/^['"]|['"]$/g, "");

  return key || VERIFIED_SUPABASE_ANON_KEY;
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
