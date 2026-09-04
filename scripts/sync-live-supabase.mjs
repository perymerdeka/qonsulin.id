import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();
const originalBundle = join(root, "tmp/research/original-public.js");
const outSql = join(root, "supabase/live-seed.sql");

async function loadDotEnvLocal() {
  try {
    const env = await readFile(join(root, ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // The script can still run with shell-provided environment variables.
  }
}

await loadDotEnvLocal();

const destinationUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const destinationAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const destinationServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const destinationAdminEmail = process.env.ADMIN_EMAIL || "halo@qonsulin.id";
const destinationAdminPassword = process.env.ADMIN_PASSWORD || "adminqonsuli123";

const tables = [
  "blog_posts",
  "activities",
  "testimonials",
  "lead_magnets",
  "gallery_events",
  "gallery_media",
  "streaming_videos"
];

function extractLiveConfig(bundle) {
  const url = bundle.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const jwt = bundle.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
  if (!url || !jwt) throw new Error("Could not extract live Supabase URL/key from tmp/research/original-public.js");
  return { url, key: jwt };
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `array[${value.map(sqlString).join(", ")}]::text[]`;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function rowColumns(rows) {
  const columns = new Set();
  for (const row of rows) Object.keys(row).forEach((key) => columns.add(key));
  return [...columns];
}

function toInsertSql(table, rows) {
  if (!rows.length) return `-- No rows for public.${table}\n`;
  const columns = rowColumns(rows);
  const values = rows.map((row) => `  (${columns.map((column) => sqlString(row[column])).join(", ")})`).join(",\n");
  const conflict = table === "blog_posts" ? "slug" : table === "gallery_events" || table === "streaming_videos" ? "slug" : "id";
  return `insert into public.${table} (${columns.join(", ")})\nvalues\n${values}\non conflict (${conflict}) do update set\n${columns.filter((column) => column !== conflict && column !== "id" && column !== "created_at").map((column) => `  ${column} = excluded.${column}`).join(",\n")};\n`;
}

async function loadLiveRows() {
  const bundle = await readFile(originalBundle, "utf8");
  const liveConfig = extractLiveConfig(bundle);
  const live = createClient(liveConfig.url, liveConfig.key, { auth: { persistSession: false } });
  const data = {};

  for (const table of tables) {
    let query = live.from(table).select("*");
    if (table !== "gallery_media") query = query.order("created_at", { ascending: false });
    const { data: rows, error } = await query;
    if (error) throw new Error(`Live read failed for ${table}: ${error.message}`);
    data[table] = rows || [];
  }

  return { liveConfig, data };
}

async function writeSeedSql(liveConfig, data) {
  const header = `-- Generated from ${liveConfig.url}\n-- Run supabase/schema.sql first, then this seed.\n\n`;
  const body = tables.map((table) => toInsertSql(table, data[table])).join("\n");
  await mkdir(dirname(outSql), { recursive: true });
  await writeFile(outSql, `${header}${body}`, "utf8");
}

async function pushWithClient(data) {
  if (!destinationUrl) return { pushed: false, reason: "NEXT_PUBLIC_SUPABASE_URL is not set" };
  const key = destinationServiceRoleKey || destinationAnonKey;
  if (!key) return { pushed: false, reason: "No destination key is set" };

  const destination = createClient(destinationUrl, key, { auth: { persistSession: false } });
  if (!destinationServiceRoleKey) {
    const { error } = await destination.auth.signInWithPassword({ email: destinationAdminEmail, password: destinationAdminPassword });
    if (error) return { pushed: false, reason: `Destination admin auth failed: ${error.message}` };
  }

  for (const table of tables) {
    const rows = data[table];
    if (!rows.length) continue;
    const conflict = table === "blog_posts" ? "slug" : table === "gallery_events" || table === "streaming_videos" ? "slug" : "id";
    const { error } = await destination.from(table).upsert(rows, { onConflict: conflict });
    if (error) return { pushed: false, reason: `Destination upsert failed for ${table}: ${error.message}` };
  }
  return { pushed: true };
}

const { liveConfig, data } = await loadLiveRows();
await writeSeedSql(liveConfig, data);
const pushResult = process.argv.includes("--push") ? await pushWithClient(data) : { pushed: false, reason: "Run with --push to write to destination Supabase" };

console.log(JSON.stringify({
  source: liveConfig.url,
  seedSql: outSql,
  rows: Object.fromEntries(tables.map((table) => [table, data[table].length])),
  push: pushResult
}, null, 2));
