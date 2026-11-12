"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import type { MemberProfile } from "@/lib/member";
import { getMemberQuota, type LetterQuota } from "@/lib/letters";
import { getMemberOrders, type PackageOrder } from "@/lib/packages";
import { MemberAppShell } from "@/components/MemberAppShell";
import type { MemberNotification } from "@/components/MemberAppShell";
import { MemberDashboard } from "@/components/MemberDashboard";

export default function MemberDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<LetterQuota | null>(null);
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentMemberProfile();
        if (!active) return;

        if (!currentProfile) {
          router.replace("/member/masuk");
          return;
        }

        setProfile(currentProfile);
        const [memberQuota, memberOrders] = await Promise.all([getMemberQuota(), getMemberOrders()]);
        if (!active) return;
        setQuota(memberQuota);
        setOrders(memberOrders);
      } catch (error) {
        console.warn("[MemberDashboard] Failed to load profile:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await getSupabaseClient()?.auth.signOut();
    } catch (error) {
      console.warn("[MemberDashboard] Logout failed:", error);
    }
    router.replace("/member/masuk");
  }

  if (loading) {
    return (
      <main className="member-loading-screen">
        <p>Memeriksa ruang ceritamu...</p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <MemberAppShell alias={profile.alias} tier={profile.tier} quota={quota} notifications={notifications} onLogout={handleLogout}>
      <MemberDashboard alias={profile.alias} memberId={profile.id} tier={profile.tier} quota={quota} orders={orders} onLetterSent={async () => setQuota(await getMemberQuota())} onNotificationsChange={setNotifications} />
    </MemberAppShell>
  );
}
