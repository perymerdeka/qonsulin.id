"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MemberAppShell, type MemberNotification } from "@/components/MemberAppShell";
import { createNotifications } from "@/components/MemberDashboard";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { getMemberLetterThreads, getMemberQuota, type LetterQuota } from "@/lib/letters";
import { getMemberOrders, type PackageOrder } from "@/lib/packages";
import { getSupabaseClient } from "@/lib/supabase";
import type { MemberProfile } from "@/lib/member";

type SettingsData = {
  profile: MemberProfile;
  quota: LetterQuota | null;
  orders: PackageOrder[];
  email: string;
  onProfileUpdated: (profile: MemberProfile) => void;
};

export function MemberSettingsShell({ activeItem, children }: { activeItem: "profile" | "account"; children: (data: SettingsData) => ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [quota, setQuota] = useState<LetterQuota | null>(null);
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const current = await getCurrentMemberProfile();
        if (!active) return;
        if (!current) {
          router.replace("/member/masuk");
          return;
        }
        const [memberQuota, memberOrders, outbox, inbox, session] = await Promise.all([
          getMemberQuota(), getMemberOrders(), getMemberLetterThreads("outbox"), getMemberLetterThreads("inbox"), getSupabaseClient()?.auth.getSession()
        ]);
        if (!active) return;
        setProfile(current);
        setQuota(memberQuota);
        setOrders(memberOrders);
        setEmail(session?.data.session?.user.email || "");
        setNotifications(createNotifications(outbox, inbox));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await getSupabaseClient()?.auth.signOut();
    router.replace("/member/masuk");
  }

  if (loading) return <main className="member-loading-screen"><p>Memuat pengaturan akunmu...</p></main>;
  if (!profile) return null;
  const effectiveTier = quota?.tier || profile.tier;

  return (
    <MemberAppShell alias={profile.alias} avatarConfig={profile.avatar_config} tier={effectiveTier} quota={quota} notifications={notifications} activeItem={activeItem} onLogout={logout}>
      <div className="member-settings-page">{children({ profile, quota, orders, email, onProfileUpdated: setProfile })}</div>
    </MemberAppShell>
  );
}
