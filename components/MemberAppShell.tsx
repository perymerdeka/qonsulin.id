"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, EllipsisVertical, Home, LogOut, Sparkles, SquarePlus, UserRound } from "lucide-react";
import type { LetterQuota } from "@/lib/letters";

export type MemberNotification = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

type MemberShellProps = {
  alias?: string;
  tier?: "free" | "premium";
  quota?: LetterQuota | null;
  notifications?: MemberNotification[];
  onLogout: () => void;
  children: React.ReactNode;
};

function formatNotificationDate(value: string) {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(difference / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(value));
}

export function MemberAppShell({ alias, tier, quota, notifications = [], onLogout, children }: MemberShellProps) {
  const isPremium = tier === "premium";
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <main className="member-app">
      <div className="member-app-shell">
        <aside className="member-sidebar">
          <div className="member-sidebar-header">
            <Link href="/member" className="member-brand"><span className="member-brand-mark">Q</span><span>Qonsulin.id</span></Link>
            <p>Support Letter</p>
          </div>

          <div className="member-notification-wrap">
            <button type="button" className="member-notification" aria-expanded={isNotificationOpen} aria-controls="member-notification-panel" onClick={() => setIsNotificationOpen((current) => !current)}>
              <Bell size={20} /><span>Notifikasi</span>{notifications.length > 0 && <b>{Math.min(notifications.length, 99)}</b>}
            </button>
            {isNotificationOpen && <section id="member-notification-panel" className="member-notification-panel" aria-label="Pembaruan surat">
              <div className="member-notification-panel-heading"><strong>Pembaruan Surat</strong><span>{notifications.length}</span></div>
              {notifications.length === 0 ? <p>Belum ada pembaruan surat.</p> : <div className="member-notification-list">{notifications.map((notification) => <article key={notification.id}><div><strong>{notification.title}</strong><p>{notification.detail}</p></div><time>{formatNotificationDate(notification.createdAt)}</time></article>)}</div>}
            </section>}
          </div>
          <nav className="member-navigation" aria-label="Navigasi member">
            <span className="member-nav-group">Main Boards</span>
            <Link href="/member" className="is-active"><Home size={20} /> Home</Link>
            <span className="member-nav-group">Settings</span>
            <Link href="/member/profil"><UserRound size={20} /> Profile</Link>
            <Link href="/layanan"><SquarePlus size={20} /> Account</Link>
            <button type="button" className="member-nav-logout" onClick={onLogout}><LogOut size={20} /> Logout</button>
          </nav>

          <div className="member-sidebar-bottom">
            {!isPremium && <div className="member-upgrade-card"><strong>Upgrade plan</strong><p>Akun Free hanya menyediakan {quota?.limit ?? 3} surat tiap bulan. Butuh lebih?</p><div className="member-quota-meter"><span style={{ width: `${Math.min(100, ((quota?.used ?? 0) / Math.max(quota?.limit ?? 3, 1)) * 100)}%` }} /></div><Link href="/layanan"><Sparkles size={15} /> Upgrade Account</Link></div>}

            <div className="member-sidebar-footer"><div className="member-account-mini"><span>{(alias || "T").slice(0, 1).toUpperCase()}</span><div><strong>{alias || "Teman Cerita"}</strong><small>{isPremium ? "Premium Account" : "Free Account"}</small></div><EllipsisVertical size={20} /></div></div>
          </div>
        </aside>
        <section className="member-app-main">{children}</section>
      </div>
    </main>
  );
}
