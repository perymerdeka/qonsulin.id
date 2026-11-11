"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { MemberProfile } from "@/lib/member";
import { getMemberQuota, type LetterQuota } from "@/lib/letters";
import { getMemberOrders, type PackageOrder } from "@/lib/packages";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Mail, Edit3, Sparkles, LogOut, HeartHandshake, ShieldCheck, LogIn, UserPlus } from "lucide-react";

export default function MemberDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [quota, setQuota] = useState<LetterQuota | null>(null);
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const p = await getCurrentMemberProfile();
        if (!active) return;
        if (!p) {
          // Redirect unauthenticated visitor to login page
          router.replace("/member/masuk");
          return;
        }
        setProfile(p);
        const [memberQuota, memberOrders] = await Promise.all([getMemberQuota(), getMemberOrders()]);
        if (!active) return;
        setQuota(memberQuota);
        setOrders(memberOrders);
      } catch (err) {
        console.warn("[MemberDashboard] Failed to load session:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Logout error:", e);
    }
    window.location.href = "/";
  };

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <div className="card" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
            <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>Memeriksa ruang ceritamu...</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <Link href="/member/masuk" className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                <LogIn size={15} /> Masuk
              </Link>
              <Link href="/member/daftar" className="btn btn-white" style={{ fontSize: "0.85rem" }}>
                <UserPlus size={15} /> Buat Akun
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  // Fallback if not logged in (e.g. while redirect executes or if redirect is cancelled)
  if (!profile) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ maxWidth: 540, margin: "3rem auto", padding: "0 1.25rem", textAlign: "center" }}>
          <div className="card" style={{ padding: "2.5rem 1.5rem" }}>
            <span className="pill" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginBottom: "1rem" }}>
              <HeartHandshake size={14} /> Ruang Cerita Anonim
            </span>
            <h1 style={{ fontSize: "1.75rem", color: "var(--color-ink)", marginBottom: "0.75rem" }}>
              Selamat Datang di Ruang Member
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              Masuk atau buat akun samaran untuk mulai menulis surat batin secara anonim, membaca cerita kawan, dan mendapatkan dukungan empati.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/member/masuk" className="btn btn-primary" style={{ minWidth: 160 }}>
                <LogIn size={16} /> Masuk ke Akun
              </Link>
              <Link href="/member/daftar" className="btn btn-white" style={{ minWidth: 160 }}>
                <UserPlus size={16} /> Daftar Akun Baru
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {/* Profile Card Banner */}
        <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center", justifyContent: "space-between", padding: "2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            <MemberAvatar config={profile.avatar_config} size={84} />
            <div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.5rem", color: "var(--color-ink)", margin: 0 }}>
                  {profile.alias || "Teman Cerita"}
                </h1>
                <span className="pill" style={{ textTransform: "uppercase", fontSize: "0.7rem", fontWeight: 800 }}>
                  {profile.tier === "premium" ? "★ Member Premium" : "Member Free"}
                </span>
              </div>
              <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginTop: "0.25rem" }}>
                {profile.bio || "Belum ada bio singkat. Kamu bisa menambahkannya di pengaturan profil."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link href="/member/profil" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem" }}>
              <Edit3 size={15} /> Edit Profil & Avatar
            </Link>
            <button onClick={handleLogout} className="btn btn-soft" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", color: "var(--color-danger)" }}>
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>

        {/* Status Quota & Next Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          {/* Card: Kuota Surat */}
          <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--color-brand)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-ink)" }}>Kuota Surat Batin</h3>
              <span className="pill muted" style={{ fontSize: "0.75rem" }}>Bulan Ini</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-brand-strong)", margin: "0.75rem 0 0.25rem" }}>
              {profile.tier === "premium" ? "Tanpa Batas" : quota ? `${quota.remaining} / ${quota.limit} Surat Tersisa` : "Kuota belum tersedia"}
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
              {profile.tier === "premium"
                ? "Kamu bebas menulis surat katarsis kapan pun membutuhkan ruang lega."
                : `Sisa ${quota?.remaining ?? 3} dari 3 surat pembuka bulan ini. Surat yang menunggu moderasi tetap dihitung sebagai kuota.`}
            </p>
            <Link href="/surat/tulis" className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
              <Mail size={16} /> Tulis Surat Batin Baru
            </Link>
          </div>

          {/* Card: Jelajahi Kolam Surat */}
          <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--color-success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-ink)" }}>Kolam Surat Komunitas</h3>
              <span className="pill" style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#166534" }}>Anonim & Aman</span>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "1rem 0" }}>
              Baca surat-surat dari teman yang sedang melewati badai serupa dan kirimkan surat balasan penguat tanpa dihakimi.
            </p>
            <Link href="/surat/pool" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
              <HeartHandshake size={16} /> Buka Kolam Surat
            </Link>
          </div>

          {/* Card: Surat Masuk */}
          <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-ink)" }}>Surat Masuk</h3>
              <span className="pill" style={{ fontSize: "0.75rem", background: "#dbeafe", color: "#1e40af" }}>Dari Kawan</span>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "1rem 0" }}>
              Lihat balasan surat dari kawan cerita yang terhubung dengan threadmu.
            </p>
            <Link href="/member/surat-masuk" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
              <Mail size={16} /> Buka Surat Masuk
            </Link>
          </div>

          {/* Card: Surat Keluar */}
          <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #8b5cf6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-ink)" }}>Surat Keluar</h3>
              <span className="pill" style={{ fontSize: "0.75rem", background: "#ede9fe", color: "#5b21b6" }}>Thread Saya</span>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "1rem 0" }}>
              Kelola surat-surat yang telah kamu kirim dan balasan yang sudah diberikan.
            </p>
            <Link href="/member/surat-keluar" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
              <Mail size={16} /> Buka Surat Keluar
            </Link>
          </div>

          {/* Card: Upgrade Premium */}
          {profile.tier !== "premium" && (
            <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid var(--accent, #f59e0b)", background: "var(--color-surface-muted)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--color-ink)" }}>Tingkatkan ke Premium</h3>
                <span className="pill" style={{ fontSize: "0.75rem", background: "#fef3c7", color: "#92400e" }}>Rp19.000 / bln</span>
              </div>
              <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "1rem 0" }}>
                Buka seluruh tema kertas eksklusif, cap lilin wax seal emas, dan kuota surat tak terbatas.
              </p>
              <Link href="/layanan" className="btn btn-soft" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", fontSize: "0.85rem", width: "100%", justifyContent: "center" }}>
                <Sparkles size={16} /> Pelajari Manfaat Premium
              </Link>
            </div>
          )}
        </div>

        {orders.length > 0 && (
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--color-brand)" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--color-ink)" }}>Status Pesanan Paket</h3>
            <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.9rem" }}>
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
                  <span><strong>{order.package_name}</strong> - {order.status === "pending" ? "Menunggu verifikasi transfer" : order.status === "active" ? "Aktif" : order.status === "rejected" ? "Ditolak" : "Berakhir"}</span>
                  <span style={{ color: "var(--color-muted)" }}>#{order.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security footnote */}
        <div style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.8rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>
          <ShieldCheck size={14} /> Sesi Anda aktif di Ruang Member QONSULIN.ID
        </div>
      </section>
      <Footer />
    </main>
  );
}


