import { getSupabaseClient } from "@/lib/supabase";
import { MemberProfile, AvatarConfig, sanitizeAlias } from "@/lib/member";

export async function getCurrentMemberProfile(): Promise<MemberProfile | null> {
  try {
    const supabase = getSupabaseClient() as any;
    if (!supabase) return null;

    // Check local session first to avoid unneeded 403 network requests
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) {
      return null;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("member_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as MemberProfile;
  } catch (err) {
    console.warn("[member-auth] getCurrentMemberProfile error:", err);
    return null;
  }
}

export async function updateMemberProfile(
  updates: { alias?: string; avatar_config?: AvatarConfig; bio?: string }
): Promise<{ ok: boolean; message?: string }> {
  try {
    const supabase = getSupabaseClient() as any;
    if (!supabase) return { ok: false, message: "Koneksi database tidak tersedia." };

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return { ok: false, message: "Sesi login telah berakhir. Silakan masuk kembali." };

    const payload: Record<string, unknown> = {};
    if (updates.alias) {
      const clean = sanitizeAlias(updates.alias);
      if (clean.length < 3) {
        return { ok: false, message: "Nama alias minimal 3 karakter." };
      }
      payload.alias = clean;
    }
    if (updates.avatar_config) payload.avatar_config = updates.avatar_config;
    if (typeof updates.bio === "string") payload.bio = updates.bio.slice(0, 160);

    const { error } = await supabase
      .from("member_profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "Nama alias tersebut sudah dipakai teman lain. Pilih nama yang berbeda ya." };
      }
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Terjadi kendala saat memperbarui profil." };
  }
}