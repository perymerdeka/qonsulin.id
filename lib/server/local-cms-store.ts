import fs from "fs";
import path from "path";
import { fallbackActivities, fallbackCompanions, fallbackGalleryEvents, fallbackLeadMagnets, fallbackPosts, fallbackStreamingVideos, fallbackTestimonials, type Store, type AnyRow, type BlogPost, type GalleryEvent } from "@/lib/cms-fallback";
import { getSupabasePublicClient } from "@/lib/supabase";

const STORE_PATH = path.join(process.cwd(), "data", "local-cms-store.json");

export const initialFallbackStore: Store = {
  posts: fallbackPosts,
  activities: fallbackActivities,
  testimonials: fallbackTestimonials,
  "lead-magnets": fallbackLeadMagnets,
  galleries: fallbackGalleryEvents,
  streaming: fallbackStreamingVideos,
  companions: fallbackCompanions
};

function mergeList<T extends { id: string }>(savedList: T[] | undefined, defaultList: T[]): T[] {
  if (!Array.isArray(savedList) || savedList.length === 0) return defaultList;
  const savedIds = new Set(savedList.map((item) => item.id));
  const missingDefaults = defaultList.filter((item) => !savedIds.has(item.id));
  return [...savedList, ...missingDefaults];
}

let inMemoryStore: Store | null = null;

export function getLocalCmsStore(): Store {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      inMemoryStore = {
        posts: mergeList(parsed.posts, initialFallbackStore.posts),
        activities: mergeList(parsed.activities, initialFallbackStore.activities),
        testimonials: mergeList(parsed.testimonials, initialFallbackStore.testimonials),
        "lead-magnets": mergeList(parsed["lead-magnets"], initialFallbackStore["lead-magnets"]),
        galleries: mergeList(parsed.galleries, initialFallbackStore.galleries),
        streaming: mergeList(parsed.streaming, initialFallbackStore.streaming),
        companions: mergeList(parsed.companions, initialFallbackStore.companions)
      };
      return inMemoryStore;
    }
  } catch (err) {
    console.warn("[Local CMS Store] File read warning:", err);
  }

  inMemoryStore = { ...initialFallbackStore };
  return inMemoryStore;
}

export function saveLocalCmsStore(store: Store) {
  inMemoryStore = store;
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    // Expected on serverless hosting (e.g. Vercel) where filesystem is read-only
    console.warn("[Local CMS Store] File write skipped (in-memory preserved):", err);
  }
}

export function upsertLocalCmsRow(section: keyof Store, payload: Record<string, unknown>, id?: string | null): AnyRow {
  const store = getLocalCmsStore();
  const list = store[section] as AnyRow[];
  const now = new Date().toISOString();
  
  const existingIndex = id ? list.findIndex((item) => item.id === id) : -1;
  const existingRow = existingIndex >= 0 ? list[existingIndex] : null;

  const newRow = {
    id: id || existingRow?.id || `local-${Date.now()}`,
    ...existingRow,
    ...payload,
    created_at: existingRow?.created_at || now,
    updated_at: now
  } as AnyRow;

  if (existingIndex >= 0) {
    list[existingIndex] = newRow;
  } else {
    list.unshift(newRow);
  }

  store[section] = list as any;
  saveLocalCmsStore(store);
  return newRow;
}

export function deleteLocalCmsRow(section: keyof Store, id: string): boolean {
  const store = getLocalCmsStore();
  const list = store[section] as AnyRow[];
  store[section] = list.filter((item) => item.id !== id) as any;
  saveLocalCmsStore(store);
  return true;
}

export async function getPostBySlugServer(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as BlogPost;
    } catch {}
  }

  const localStore = getLocalCmsStore();
  const found = localStore.posts.find((post) => post.slug === slug);
  if (found) return found;

  return fallbackPosts.find((post) => post.slug === slug) || null;
}

export async function getGalleryEventBySlugServer(slug: string): Promise<GalleryEvent | null> {
  const supabase = getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("gallery_events").select("*").eq("slug", slug).maybeSingle();
      if (!error && data) return data as GalleryEvent;
    } catch {}
  }

  const localStore = getLocalCmsStore();
  const found = localStore.galleries.find((event) => event.slug === slug);
  if (found) return found;

  return fallbackGalleryEvents.find((event) => event.slug === slug) || null;
}
