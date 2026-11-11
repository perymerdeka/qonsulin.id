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
  status: "open" | "closed" | "blocked" | "flagged";
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
export type MemberThreadSummary = {
  id: string;
  topic: string;
  status: "open" | "closed" | "blocked" | "flagged";
  created_at: string;
  moderation_status: "pending" | "approved" | "rejected" | "crisis_hold";
  is_opening: boolean;
  preview: string;
  title?: string | null;
  author_alias?: string;
};

export async function getMemberLetterThreads(scope: "inbox" | "outbox"): Promise<MemberThreadSummary[]> {
  try {
    const supabase = (getSupabaseClient() || getSupabasePublicClient()) as any;
    if (!supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return [];

    let rows: any[] = [];
    if (scope === "outbox") {
      const { data, error } = await supabase
        .from("letters")
        .select("id, thread_id, sender_id, is_opening, title, content, moderation_status, created_at, letter_threads(topic, status)")
        .eq("sender_id", userId)
        .eq("is_opening", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error || !data) return [];
      rows = data;
    } else {
      const { data: myThreads, error: threadErr } = await supabase
        .from("letter_threads")
        .select("id")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (threadErr || !myThreads) return [];
      const threadIds = myThreads.map((thread: any) => thread.id);
      if (threadIds.length === 0) return [];

      const { data: replies, error } = await supabase
        .from("letters")
        .select("id, thread_id, sender_id, is_opening, title, content, moderation_status, created_at, letter_threads(topic, status)")
        .in("thread_id", threadIds)
        .eq("is_opening", false)
        .eq("moderation_status", "approved")
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error || !replies) return [];
      rows = replies;
    }

    const scoped = rows;

    const senderIds = [...new Set(scoped.map((row: any) => row.sender_id))];
    const { data: profiles } = senderIds.length
      ? await supabase.from("member_profiles").select("id, alias").in("id", senderIds)
      : { data: [] };
    const aliasById = new Map<string, string>((profiles || []).map((profile: any) => [profile.id, profile.alias]));

    return scoped.map((row: any) => ({
      id: row.thread_id,
      topic: row.letter_threads?.topic || "Luapan Hati",
      status: row.letter_threads?.status || "open",
      created_at: row.created_at,
      moderation_status: row.moderation_status,
      is_opening: row.is_opening,
      title: row.title,
      preview: row.content,
      author_alias: aliasById.get(row.sender_id) || "Kawan Anonim"
    }));
  } catch {
    return [];
  }
}
export type ReportCategory =
  | "personal_data"
  | "harassment"
  | "hate_speech"
  | "sexual_content"
  | "spam"
  | "crisis"
  | "other";

export const reportCategoryLabels: Record<ReportCategory, string> = {
  personal_data: "Berisi data pribadi / doxxing",
  harassment: "Pelecehan atau intimidasi",
  hate_speech: "Ujaran kebencian",
  sexual_content: "Konten seksual / tidak pantas",
  spam: "Spam atau promosi tidak relevan",
  crisis: "Indikasi krisis / membahayakan diri",
  other: "Lainnya"
};

export async function reportLetterThread(threadId: string, reason: string, detail?: string) {
  try {
    const supabase = (getSupabaseClient() || getSupabasePublicClient()) as any;
    if (!supabase) return { ok: false, message: "Koneksi database tidak tersedia." };
    const { data, error } = await supabase.rpc("report_letter_thread", {
      p_thread_id: threadId,
      p_reason: reason,
      p_detail: detail || null
    });
    if (error || !data?.ok) return { ok: false, message: data?.message || error?.message || "Laporan gagal dikirim." };
    return { ok: true, report_id: data.report_id as string };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Laporan gagal dikirim." };
  }
}

export async function blockLetterThread(threadId: string) {
  try {
    const supabase = (getSupabaseClient() || getSupabasePublicClient()) as any;
    if (!supabase) return { ok: false, message: "Koneksi database tidak tersedia." };
    const { data, error } = await supabase.rpc("block_letter_thread", { p_thread_id: threadId });
    if (error || !data?.ok) return { ok: false, message: data?.message || error?.message || "Blokir gagal." };
    return { ok: true, thread_id: data.thread_id as string };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Blokir gagal." };
  }
}

export async function closeLetterThread(threadId: string) {
  try {
    const supabase = (getSupabaseClient() || getSupabasePublicClient()) as any;
    if (!supabase) return { ok: false, message: "Koneksi database tidak tersedia." };
    const { data, error } = await supabase.rpc("close_letter_thread", { p_thread_id: threadId });
    if (error || !data?.ok) return { ok: false, message: data?.message || error?.message || "Thread gagal ditutup." };
    return { ok: true, thread_id: data.thread_id as string };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Thread gagal ditutup." };
  }
}