import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getSupabasePublicClient } from "@/lib/supabase";
import { deleteLocalCmsRow, getLocalCmsStore, upsertLocalCmsRow } from "@/lib/server/local-cms-store";

type CmsSection = "posts" | "activities" | "testimonials" | "lead-magnets" | "galleries" | "streaming" | "companions";

const tableBySection: Record<CmsSection, string> = {
  posts: "blog_posts",
  activities: "activities",
  testimonials: "testimonials",
  "lead-magnets": "lead_magnets",
  galleries: "gallery_events",
  streaming: "streaming_videos",
  companions: "companions"
};

function authorized(request: NextRequest) {
  return verifyAdminSessionValue(request.cookies.get(adminCookieName)?.value);
}

function sectionFrom(value: unknown): CmsSection | null {
  return typeof value === "string" && value in tableBySection ? value as CmsSection : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitList(value: string, multilineOnly = false) {
  return value
    .split(multilineOnly ? /\n/ : /\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePayload(section: CmsSection, payload: Record<string, unknown>) {
  const normalized: Record<string, unknown> = { ...payload };

  if ("tags" in normalized && typeof normalized.tags === "string") {
    normalized.tags = splitList(normalized.tags);
  }
  if ("sort_order" in normalized) normalized.sort_order = Number(normalized.sort_order || 0);
  if ("is_featured" in normalized) normalized.is_featured = Boolean(normalized.is_featured);
  if ("cta_enabled" in normalized) normalized.cta_enabled = Boolean(normalized.cta_enabled);
  for (const key of ["focus_tags", "education", "focus", "experience"]) {
    if (key in normalized && typeof normalized[key] === "string") {
      normalized[key] = splitList(String(normalized[key]), section === "companions");
    }
  }
  if ((section === "posts" || section === "galleries" || section === "streaming") && !normalized.slug && normalized.title) {
    normalized.slug = slugify(String(normalized.title));
  }
  if (section === "posts" && normalized.status === "published" && !normalized.published_at) {
    normalized.published_at = new Date().toISOString();
  }
  if ("live_at" in normalized && normalized.live_at === "") normalized.live_at = null;
  if ("published_at" in normalized && normalized.published_at === "") normalized.published_at = null;
  if ("event_date" in normalized && normalized.event_date === "") normalized.event_date = null;

  return normalized;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const supabase = adminClient || publicClient;
  if (!supabase) {
    return NextResponse.json({ ok: true, store: getLocalCmsStore(), isLocal: true });
  }

  let [posts, activities, testimonials, leads, galleries, streaming, companions] = await Promise.all([
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
    supabase.from("activities").select("*").order("created_at", { ascending: false }),
    supabase.from("testimonials").select("*").order("created_at", { ascending: false }),
    supabase.from("lead_magnets").select("*").order("created_at", { ascending: false }),
    supabase.from("gallery_events").select("*, gallery_media(count)").order("created_at", { ascending: false }),
    supabase.from("streaming_videos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("companions").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
  ]);

  let failed = [posts, activities, testimonials, leads, galleries, streaming, companions].find((result) => result.error);

  if (failed?.error) {
    return NextResponse.json({ ok: true, store: getLocalCmsStore(), isLocal: true });
  }

  return NextResponse.json({
    ok: true,
    store: {
      posts: posts.data || [],
      activities: activities.data || [],
      testimonials: testimonials.data || [],
      "lead-magnets": leads.data || [],
      galleries: (galleries.data || []).map((event: any) => ({
        ...event,
        media_count: Array.isArray(event.gallery_media) ? event.gallery_media[0]?.count || 0 : event.media_count || 0
      })),
      streaming: streaming.data || [],
      companions: companions.data || []
    }
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { section?: unknown; id?: unknown; payload?: unknown };
  const section = sectionFrom(body.section);
  if (!section || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return NextResponse.json({ ok: false, message: "Payload CMS tidak valid." }, { status: 400 });
  }

  const table = tableBySection[section];
  const payload = normalizePayload(section, body.payload as Record<string, unknown>);
  const id = typeof body.id === "string" && body.id ? body.id : null;

  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const supabase = adminClient || publicClient;

  if (supabase) {
    try {
      const result = id
        ? await supabase.from(table).update(payload).eq("id", id).select().single()
        : await supabase.from(table).insert([payload]).select().single();

      if (!result.error && result.data) {
        upsertLocalCmsRow(section, result.data as any, id);
        return NextResponse.json({ ok: true, row: result.data });
      }
    } catch (err) {
      console.warn("Supabase insert/update failed, falling back to local store:", err);
    }
  }

  const localRow = upsertLocalCmsRow(section, payload, id);
  return NextResponse.json({ ok: true, row: localRow, isLocal: true });
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const section = sectionFrom(request.nextUrl.searchParams.get("section"));
  const id = request.nextUrl.searchParams.get("id");
  if (!section || !id) return NextResponse.json({ ok: false, message: "Section atau id tidak valid." }, { status: 400 });

  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const supabase = adminClient || publicClient;

  if (supabase) {
    try {
      const { error } = await supabase.from(tableBySection[section]).delete().eq("id", id);
      if (!error) {
        deleteLocalCmsRow(section, id);
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      console.warn("Supabase delete failed, falling back to local store:", err);
    }
  }

  deleteLocalCmsRow(section, id);
  return NextResponse.json({ ok: true, isLocal: true });
}
