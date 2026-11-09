import { getSupabasePublicClient, getSupabaseClient } from "@/lib/supabase";
import { MemberProfile } from "@/lib/member";

export type ReplyType = "community" | "volunteer" | "professional";

export type LetterTemplate = {
  id: string;
  code: string;
  name: string;
  paper_style: string;
  wax_seal_color: string;
  tier_required: "free" | "premium";
  is_active: boolean;
  sort_order: number;
};

export type LetterItem = {
  id: string;
  thread_id: string;
  sender_id: string;
  is_opening: boolean;
  reply_type: ReplyType;
  template_code: string;
  title?: string | null;
  content: string;
  moderation_status: "pending" | "approved" | "rejected" | "crisis_hold";
  created_at: string;
  author_alias?: string;
  author_avatar?: any;
  topic?: string;
};

export type LetterThreadDetail = {
  id: string;
  topic: string;
  status: "open" | "closed" | "flagged";
  created_at: string;
  opening_letter: LetterItem;
  replies: LetterItem[];
};

export type LetterQuota = {
  tier: "free" | "premium";
  used: number;
  limit: number;
  remaining: number;
  can_send: boolean;
};

export const defaultTemplates: LetterTemplate[] = [
  {
    id: "tpl-1",
    code: "vintage_parchment",
    name: "Kertas Lilin Klasik",
    paper_style: "paper-vintage",
    wax_seal_color: "#991b1b",
    tier_required: "free",
    is_active: true,
    sort_order: 1
  },
  {
    id: "tpl-2",
    code: "warm_pastel",
    name: "Senja Tenang Pastel",
    paper_style: "paper-pastel",
    wax_seal_color: "#b45309",
    tier_required: "free",
    is_active: true,
    sort_order: 2
  },
  {
    id: "tpl-3",
    code: "night_sky",
    name: "Langit Malam Sunyi",
    paper_style: "paper-night",
    wax_seal_color: "#4338ca",
    tier_required: "premium",
    is_active: true,
    sort_order: 3
  },
  {
    id: "tpl-4",
    code: "botanical_sage",
    name: "Sage Daun Teduh",
    paper_style: "paper-sage",
    wax_seal_color: "#15803d",
    tier_required: "premium",
    is_active: true,
    sort_order: 4
  }
];

export const replyTypeLabels: Record<ReplyType, { label: string; badgeClass: string; icon: string }> = {
  community: { label: "Community Support", badgeClass: "pill-community", icon: "💌" },
  volunteer: { label: "Volunteer Support", badgeClass: "pill-volunteer", icon: "🤝" },
  professional: { label: "Professional Support", badgeClass: "pill-pro", icon: "🧠" }
};

export async function getActiveTemplates(): Promise<LetterTemplate[]> {
  try {
    const supabase = getSupabasePublicClient();
    if (!supabase) return defaultTemplates;
    const { data, error } = await supabase
      .from("letter_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return defaultTemplates;
    return data as LetterTemplate[];
  } catch {
    return defaultTemplates;
  }
}

export async function getMemberQuota(): Promise<LetterQuota> {
  const fallback: LetterQuota = { tier: "free", used: 0, limit: 3, remaining: 3, can_send: true };
  try {
    const supabase = getSupabaseClient() as any;
    if (!supabase) return fallback;
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return fallback;

    const { data, error } = await supabase.rpc("get_member_letter_quota", { p_user_id: user.id });
    if (error || !data) return fallback;
    return data as LetterQuota;
  } catch {
    return fallback;
  }
}

async function attachAuthorDetails(supabase: any, items: any[], topicByThread = new Map<string, string>()) {
  const senderIds = [...new Set(items.map((item) => item.sender_id).filter(Boolean))];
  const { data: profiles } = senderIds.length
    ? await supabase.from("member_profiles").select("id, alias, avatar_config").in("id", senderIds)
    : { data: [] };
  const profilesById = new Map<string, Pick<MemberProfile, "alias" | "avatar_config">>((profiles || []).map((profile: any) => [profile.id, profile]));

  return items.map((item) => {
    const author = profilesById.get(item.sender_id);
    return {
      id: item.id,
      thread_id: item.thread_id,
      sender_id: item.sender_id,
      is_opening: item.is_opening,
      reply_type: item.reply_type,
      template_code: item.template_code,
      title: item.title,
      content: item.content,
      moderation_status: item.moderation_status,
      created_at: item.created_at,
      topic: item.letter_threads?.topic || topicByThread.get(item.thread_id) || "Luapan Hati",
      author_alias: author?.alias || "Kawan Anonim",
      author_avatar: author?.avatar_config || { mood: "smile", bg: "sky" }
    } as LetterItem;
  });
}

export async function getPoolLetters(): Promise<LetterItem[]> {
  try {
    const supabase = getSupabasePublicClient() as any;
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("letters")
      .select(`
        id, thread_id, sender_id, is_opening, reply_type, template_code,
        title, content, moderation_status, created_at,
        letter_threads ( topic, status )
      `)
      .eq("is_opening", true)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) {
      console.warn("[getPoolLetters] error:", error);
      return [];
    }

    return attachAuthorDetails(supabase, data);
  } catch {
    return [];
  }
}
export async function getThreadDetail(threadId: string): Promise<LetterThreadDetail | null> {
  try {
    const supabase = (getSupabaseClient() || getSupabasePublicClient()) as any;
    if (!supabase) return null;

    const { data: thread, error: threadErr } = await supabase
      .from("letter_threads")
      .select("id, topic, status, created_at")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr || !thread) return null;

    const { data: letters, error: lettersErr } = await supabase
      .from("letters")
      .select("id, thread_id, sender_id, is_opening, reply_type, template_code, title, content, moderation_status, created_at")
      .eq("thread_id", threadId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: true });
    if (lettersErr || !letters || letters.length === 0) return null;

    const mapped = await attachAuthorDetails(supabase, letters, new Map([[thread.id, thread.topic]]));
    const opening = mapped.find((letter) => letter.is_opening) || mapped[0];
    if (!opening) return null;

    return {
      id: thread.id,
      topic: thread.topic,
      status: thread.status,
      created_at: thread.created_at,
      opening_letter: opening,
      replies: mapped.filter((letter) => !letter.is_opening)
    };
  } catch {
    return null;
  }
}
