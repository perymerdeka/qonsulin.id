import { getSupabasePublicClient } from "@/lib/supabase";
import {
  fallbackActivities,
  fallbackCompanions,
  fallbackGalleryEvents,
  fallbackGalleryMedia,
  fallbackLeadMagnets,
  fallbackPosts,
  fallbackStreamingVideos,
  fallbackTestimonials,
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

async function listFromSupabase<T>(table: string, fallback: T[], includeDrafts = false, order = "created_at") {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallback;

  try {
    let query = supabase.from(table).select("*").order(order, { ascending: false });
    if (!includeDrafts) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) return fallback;
    return ((data || []) as T[]).length ? (data || []) as T[] : fallback;
  } catch {
    return fallback;
  }
}

export async function getPublishedPosts() {
  return listFromSupabase<BlogPost>("blog_posts", fallbackPosts.filter((post) => post.status === "published"));
}

export async function getPostBySlug(slug: string) {
  const supabase = getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as BlogPost;
    } catch {}
  }

  return fallbackPosts.find((post) => post.slug === slug) || null;
}

export async function getPublishedActivities() {
  return listFromSupabase<ActivityItem>("activities", fallbackActivities.filter((item) => item.status === "published"));
}

export async function getPublishedTestimonials() {
  return listFromSupabase<Testimonial>("testimonials", fallbackTestimonials.filter((item) => item.status === "published"));
}

export async function getPublishedLeadMagnets() {
  return listFromSupabase<LeadMagnet>("lead_magnets", fallbackLeadMagnets.filter((item) => item.status === "published"));
}

export async function getPublishedGalleryEvents() {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallbackGalleryEvents;

  try {
    const { data, error } = await supabase
      .from("gallery_events")
      .select("*, gallery_media(count)")
      .eq("status", "published")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) return fallbackGalleryEvents;
    const rows = (data || []).map((event) => ({
      ...event,
      media_count: Array.isArray(event.gallery_media) ? event.gallery_media[0]?.count || 0 : event.media_count || 0
    })) as GalleryEvent[];
    return rows.length ? rows : fallbackGalleryEvents;
  } catch {
    return fallbackGalleryEvents;
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

  return fallbackGalleryEvents.find((event) => event.slug === slug) || null;
}

export async function getGalleryMedia(eventId: string) {
  const supabase = getSupabasePublicClient();
  if (!supabase) return fallbackGalleryMedia.filter((item) => item.gallery_event_id === eventId);

  try {
    const { data, error } = await supabase.from("gallery_media").select("*").eq("gallery_event_id", eventId).order("sort_order", { ascending: true });
    if (error) return fallbackGalleryMedia.filter((item) => item.gallery_event_id === eventId);
    return (data || []) as GalleryMedia[];
  } catch {
    return fallbackGalleryMedia.filter((item) => item.gallery_event_id === eventId);
  }
}

export async function getPublishedStreamingVideos() {
  const videos = await listFromSupabase<StreamingVideo>("streaming_videos", fallbackStreamingVideos, false, "sort_order");
  return [...videos].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.sort_order || 0) - (b.sort_order || 0));
}

export async function getPublishedCompanions() {
  const companions = await listFromSupabase<CompanionProfile>("companions", fallbackCompanions.filter((item) => item.status === "published"), false, "sort_order");
  return [...companions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}
