export type AvatarMood = "smile" | "calm" | "relieved" | "thoughtful";
export type AvatarBg = "sky" | "sunset" | "sage" | "lavender" | "rose";

export type AvatarConfig = {
  mood: AvatarMood;
  glasses: boolean;
  bg: AvatarBg;
};

export type MemberRole = "member" | "moderator" | "admin";
export type StaffRole = "admin" | "moderator";
export type MemberTier = "free" | "premium";

export type MemberProfile = {
  id: string;
  alias: string;
  role: MemberRole;
  tier: MemberTier;
  avatar_config: AvatarConfig;
  bio?: string | null;
  accepted_terms_at: string;
  created_at: string;
  updated_at: string;
};

export const defaultAvatarConfig: AvatarConfig = {
  mood: "smile",
  glasses: false,
  bg: "sky"
};

export const avatarBgColors: Record<AvatarBg, { bg: string; label: string }> = {
  sky: { bg: "#e0f2fe", label: "Langit Pagi" },
  sunset: { bg: "#fef3c7", label: "Senja Hangat" },
  sage: { bg: "#dcfce7", label: "Sage Damai" },
  lavender: { bg: "#f3e8ff", label: "Lavender" },
  rose: { bg: "#ffe4e6", label: "Mawar Tenang" }
};

export const avatarMoodOptions: Array<{ id: AvatarMood; label: string; desc: string }> = [
  { id: "smile", label: "Senyum Lembut", desc: "Ramah dan hangat" },
  { id: "calm", label: "Datar Reflektif", desc: "Hening dan tenang" },
  { id: "relieved", label: "Lega & Napas", desc: "Melepas beban pikiran" },
  { id: "thoughtful", label: "Merona & Berpikir", desc: "Reflektif dan tulus" }
];

export function sanitizeAlias(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .slice(0, 30);
}
