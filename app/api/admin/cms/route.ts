import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getSupabasePublicClient } from "@/lib/supabase";

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
  const supabase = (adminClient || publicClient) as any;

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      message: "Database Supabase tidak terkonfigurasi. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah terpasang di Environment Variables.",
      store: {
        posts: [],
        activities: [],
        testimonials: [],
        "lead-magnets": [],
        galleries: [],
        streaming: [],
        companions: []
      }
    }, { status: 500 });
  }

  const [postsRes, activitiesRes, testimonialsRes, leadsRes, galleriesRes, streamingRes, companionsRes] = await Promise.all([
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
    supabase.from("activities").select("*").order("created_at", { ascending: false }),
    supabase.from("testimonials").select("*").order("created_at", { ascending: false }),
    supabase.from("lead_magnets").select("*").order("created_at", { ascending: false }),
    supabase.from("gallery_events").select("*").order("created_at", { ascending: false }),
    supabase.from("streaming_videos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("companions").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
  ]);

  return NextResponse.json({
    ok: true,
    store: {
      posts: postsRes.data || [],
      activities: activitiesRes.data || [],
      testimonials: testimonialsRes.data || [],
      "lead-magnets": leadsRes.data || [],
      galleries: galleriesRes.data || [],
      streaming: streamingRes.data || [],
      companions: companionsRes.data || []
    },
    errors: {
      posts: postsRes.error?.message,
      activities: activitiesRes.error?.message,
      testimonials: testimonialsRes.error?.message,
      "lead-magnets": leadsRes.error?.message,
      galleries: galleriesRes.error?.message,
      streaming: streamingRes.error?.message,
      companions: companionsRes.error?.message
    }
  });
}

const allowedColumns: Record<CmsSection, string[]> = {
  posts: ["title", "slug", "excerpt", "content", "cover_image_url", "category", "tags", "status", "seo_title", "seo_description", "published_at"],
  activities: ["title", "description", "type", "source_url", "image_url", "date", "status"],
  testimonials: ["quote", "persona", "context", "status"],
  "lead-magnets": ["title", "description", "file_url", "cta_label", "status"],
  galleries: ["title", "slug", "description", "cover_image_url", "source_url", "event_date", "status"],
  streaming: ["title", "slug", "description", "video_url", "thumbnail_url", "source_label", "stream_type", "published_at", "live_at", "sort_order", "is_featured", "status"],
  companions: ["name", "role", "badge", "credential", "image_url", "description", "preview", "focus_tags", "education", "focus", "experience", "languages", "cta_enabled", "sort_order", "status"]
};

function isValidUuid(value?: string | null): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function filterPayload(section: CmsSection, payload: Record<string, unknown>): Record<string, unknown> {
  const allowed = allowedColumns[section] || [];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in payload) {
      filtered[key] = payload[key] === "" ? null : payload[key];
    }
  }
  return filtered;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { section?: unknown; id?: unknown; payload?: unknown };
  const section = sectionFrom(body.section);
  if (!section || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return NextResponse.json({ ok: false, message: "Payload tidak valid." }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const supabase = (adminClient || publicClient) as any;

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Database Supabase tidak terhubung di server." }, { status: 500 });
  }

  const table = tableBySection[section];
  const normalized = normalizePayload(section, body.payload as Record<string, unknown>);
  const cleanPayload = filterPayload(section, normalized);
  const rawId = typeof body.id === "string" && body.id ? body.id : null;
  const isRealUuid = isValidUuid(rawId);

  try {
    let targetId: string | null = isRealUuid ? rawId : null;

    if (!targetId) {
      if (cleanPayload.slug && (section === "posts" || section === "galleries" || section === "streaming")) {
        const { data: existing } = await supabase.from(table).select("id").eq("slug", String(cleanPayload.slug)).maybeSingle();
        if (existing?.id) targetId = existing.id;
      } else if (cleanPayload.name && section === "companions") {
        const { data: existing } = await supabase.from(table).select("id").eq("name", String(cleanPayload.name)).maybeSingle();
        if (existing?.id) targetId = existing.id;
      }
    }

    let result: any = targetId
      ? await supabase.from(table).update(cleanPayload).eq("id", targetId).select().single()
      : await supabase.from(table).insert([cleanPayload]).select().single();

    if (result.error && !targetId && result.error.code === "23505") {
      if (cleanPayload.slug && (section === "posts" || section === "galleries" || section === "streaming")) {
        const { data: existing } = await supabase.from(table).select("id").eq("slug", String(cleanPayload.slug)).maybeSingle();
        if (existing?.id) {
          result = await supabase.from(table).update(cleanPayload).eq("id", existing.id).select().single();
        }
      }
    }

    if (result.error || !result.data) {
      const errorMsg = result.error?.message || "Gagal menyimpan ke database Supabase.";
      console.error("[CMS Server Error] Supabase save error:", errorMsg);
      return NextResponse.json({ ok: false, message: errorMsg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, row: result.data });
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error("[CMS Server Error] Supabase exception:", err);
    return NextResponse.json({ ok: false, message: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const section = sectionFrom(request.nextUrl.searchParams.get("section"));
  const rawId = request.nextUrl.searchParams.get("id");
  if (!section || !rawId) return NextResponse.json({ ok: false, message: "Parameter tidak valid." }, { status: 400 });

  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const supabase = (adminClient || publicClient) as any;

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Database Supabase tidak terhubung di server." }, { status: 500 });
  }

  try {
    const isRealUuid = isValidUuid(rawId);
    if (!isRealUuid) {
      return NextResponse.json({ ok: false, message: "ID data tidak valid di database." }, { status: 400 });
    }

    const { error } = await supabase.from(tableBySection[section]).delete().eq("id", rawId);
    if (error) {
      console.error("[CMS Server Error] Supabase delete error:", error.message || error);
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[CMS Server Error] Supabase delete exception:", err);
    return NextResponse.json({ ok: false, message: err?.message || "Gagal menghapus data di database." }, { status: 500 });
  }
}
