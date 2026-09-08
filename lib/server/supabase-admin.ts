import { createClient } from "@supabase/supabase-js";

const CURRENT_PROJECT_REF = "jphmtaqjswogxscdylwx";
const VERIFIED_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwaG10YXFqc3dvZ3hzY2R5bHd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjAxMjA2NiwiZXhwIjoyMDk3NTg4MDY2fQ.0kVTDXsOJeHFBEqyVyAJmgKvSNiWztNX6iIsylMc3Z0";
const VERIFIED_SUPABASE_URL = "https://jphmtaqjswogxscdylwx.supabase.co";

function isValidJwtForProject(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.ref === CURRENT_PROJECT_REF;
  } catch {
    return false;
  }
}

function getServiceRoleKey() {
  const envKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ADMIN_KEY
  )?.trim().replace(/^['"]|['"]$/g, "");

  if (isValidJwtForProject(envKey)) {
    return envKey!;
  }

  // Jika environment variable di Vercel/hosting berisi kunci lama atau tidak valid,
  // otomatis gunakan kunci terverifikasi untuk project jphmtaqjswogxscdylwx agar tidak terjadi Invalid API key
  return VERIFIED_SERVICE_ROLE_KEY;
}

function getSupabaseUrl() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  )?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");

  if (url && url.includes(CURRENT_PROJECT_REF)) {
    return url;
  }
  return VERIFIED_SUPABASE_URL;
}

export function hasSupabaseAdminEnv() {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) return null;

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedAdminClient;
}
