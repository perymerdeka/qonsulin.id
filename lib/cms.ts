import { getSupabasePublicClient } from "@/lib/supabase";
import {
  type ActivityItem,
  type BlogPost,
  type CompanionProfile,
  type GalleryEvent,
  type GalleryMedia,
  type LeadMagnet,
  type StreamingVideo,
  type Testimonial
} from "@/lib/cms-fallback";

export * from "@/lib/cms-fallback";

async function listFromSupabase<T>(table: string, includeDrafts = false, order = "created_at"): Promise<T[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    let query = supabase.from(table).select("*").order(order, { ascending: false });
    if (!includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error || !data) return [];
    return data as T[];
  } catch {
    return [];
  }
}

export async function getPublishedPosts() {
  return listFromSupabase<BlogPost>("blog_posts");
}

export async function getPostBySlug(slug: string) {
  const supabase = getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as BlogPost;
    } catch {}
  }
  return null;
}

export async function getPublishedActivities() {
  return listFromSupabase<ActivityItem>("activities");
}

export async function getPublishedTestimonials() {
  return listFromSupabase<Testimonial>("testimonials");
}

export async function getPublishedLeadMagnets() {
  return listFromSupabase<LeadMagnet>("lead_magnets");
}

export async function getPublishedGalleryEvents() {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("gallery_events")
      .select("*, gallery_media(count)")
      .eq("status", "published")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    const rows = (data as Record<string, any>[]).map((event) => ({
      ...event,
      media_count: Array.isArray(event.gallery_media) ? event.gallery_media[0]?.count || 0 : event.media_count || 0
    })) as GalleryEvent[];
    return rows;
  } catch {
    return [];
  }
}

export async function getGalleryEventBySlug(slug: string) {
  const supabase = getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("gallery_events").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as GalleryEvent;
    } catch {}
  }
  return null;
}

export async function getGalleryMedia(eventId: string) {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from("gallery_media").select("*").eq("gallery_event_id", eventId).order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data as GalleryMedia[];
  } catch {
    return [];
  }
}

export async function getPublishedStreamingVideos() {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from("streaming_videos").select("*").eq("status", "published").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error || !data) return [];
    const videos = data as StreamingVideo[];
    return [...videos].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.sort_order || 0) - (b.sort_order || 0));
  } catch {
    return [];
  }
}

export async function getPublishedCompanions() {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from("companions").select("*").eq("status", "published").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error || !data) return [];
    const companions = data as CompanionProfile[];
    return [...companions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  } catch {
    return [];
  }
}
