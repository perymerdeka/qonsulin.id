"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { getMemberLetterThreads, MemberThreadSummary } from "@/lib/letters";
import { Mail, Inbox, Send, ShieldCheck, Lock, RefreshCw, Loader2, PenLine, ArrowRight } from "lucide-react";

type Scope = "inbox" | "outbox";

const scopeCopy: Record<Scope, {
  title: string;
  short: string;
  what: string;
  how: string;
  emptyTitle: string;
  emptyBody: string;
  itemLabel: string;
}> = {
  inbox: {
    title: "Surat Masuk",
    short: "Balasan yang kamu terima",
    what: "Balasan komunitas atau Tim Qonsulin pada surat yang kamu tulis.",
    how: "Balasan komunitas muncul setelah moderasi. Balasan surat privat hanya dikirim oleh admin Qonsulin.",
    emptyTitle: "Belum ada balasan masuk",
    emptyBody: "Kalau suratmu sudah disetujui dan ada kawan yang membalas, balasannya akan tampil di sini.",
    itemLabel: "Balasan masuk"
  },
  outbox: {
    title: "Surat Keluar",
    short: "Surat yang kamu kirim",
    what: "Surat publik dan surat privat yang kamu kirim.",
    how: "Surat publik memakai status moderasi. Surat tujuan khusus memakai status penanganan admin dan tidak tampil di Kolam Surat.",
    emptyTitle: "Belum ada surat terkirim",
    emptyBody: "Surat publik maupun surat privat yang kamu tulis akan tercatat di sini.",
    itemLabel: "Surat terkirim"
  }
};

function moderationBadge(status: MemberThreadSummary["moderation_status"]) {
  if (status === "pending") return { label: "Menunggu Moderasi", bg: "#fef3c7", color: "#92400e" };
  if (status === "approved") return { label: "Disetujui", bg: "#dcfce7", color: "#166534" };
  if (status === "rejected") return { label: "Ditolak", bg: "#fee2e2", color: "#991b1b" };
  if (status === "crisis_hold") return { label: "Ditahan Untuk Safety", bg: "#ffedd5", color: "#9a3412" };
  return null;
}

function threadBadge(status: MemberThreadSummary["status"]) {
  if (status === "closed") return { label: "Percakapan Ditutup", bg: "#fef3c7", color: "#92400e" };
  if (status === "blocked") return { label: "Diblokir", bg: "#fee2e2", color: "#991b1b" };
  if (status === "flagged") return { label: "Ditinjau Moderator", bg: "#fef9c3", color: "#854d0e" };
  return null;
}

function specialHandlingBadge(status: MemberThreadSummary["handling_status"]) {
  const labels = { waiting: "Menunggu Disposisi", assigned: "Sudah Ditugaskan", in_progress: "Sedang Diproses", completed: "Selesai", needs_attention: "Perlu Perhatian" } as const;
  const tones = { waiting: ["#fef3c7", "#92400e"], assigned: ["#dbeafe", "#1d4ed8"], in_progress: ["#e0e7ff", "#3730a3"], completed: ["#dcfce7", "#166534"], needs_attention: ["#ffedd5", "#9a3412"] } as const;
  const current = status || "waiting";
  return { label: labels[current], bg: tones[current][0], color: tones[current][1] };
}

export function MemberLetterBox({ scope }: { scope: Scope }) {
  const router = useRouter();
  const [items, setItems] = useState<MemberThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const copy = scopeCopy[scope];
  const Icon = scope === "inbox" ? Inbox : Send;

  async function load() {
    setLoading(true);
    setErrorMsg("");
    try {
      const profile = await getCurrentMemberProfile();
      if (!profile) {
        setNotLoggedIn(true);
        router.replace("/member/masuk");
        return;
      }
      setNotLoggedIn(false);
      const data = await getMemberLetterThreads(scope);
      setItems(data);
    } catch (e: any) {
      console.warn("Failed to load letter box:", e);
      setErrorMsg(e?.message || "Kotak surat gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [scope]);

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <Loader2 className="spin" style={{ margin: "0 auto 1rem", display: "block" }} size={28} />
          <p style={{ color: "var(--color-muted)" }}>Membuka kotak suratmu...</p>
        </section>
        <Footer />
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ maxWidth: 480, margin: "3rem auto", textAlign: "center" }}>
          <div className="card" style={{ padding: "2rem 1.5rem" }}>
            <h2>Masuk Terlebih Dahulu</h2>
            <p style={{ color: "var(--color-muted)", margin: "1rem 0 1.5rem" }}>
              Login member dibutuhkan untuk membuka kotak suratmu.
            </p>
            <Link href="/member/masuk" className="btn btn-primary">Ke Halaman Masuk</Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 800, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <Link href="/member" style={{ fontSize: "0.82rem", color: "var(--color-brand-strong)", fontWeight: 700 }}>
            &larr; Kembali ke Ruang Member
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <div>
            <span className="pill" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.6rem" }}>
              <Icon size={14} /> {copy.short}
            </span>
            <h1 style={{ fontSize: "1.75rem", color: "var(--color-ink)", margin: 0 }}>{copy.title}</h1>
            <p style={{ color: "var(--color-ink)", fontSize: "0.95rem", margin: "0.5rem 0 0", maxWidth: 560 }}>
              <strong>{copy.what}</strong>
            </p>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "0.35rem 0 0", maxWidth: 560 }}>
              {copy.how}
            </p>
          </div>
          <button onClick={load} className="btn btn-white" style={{ fontSize: "0.8rem", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Perbarui
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--color-rule)", paddingBottom: "1rem" }}>
          <Link
            href="/member/surat-masuk"
            className="btn btn-white"
            style={{
              fontSize: "0.82rem",
              display: "inline-flex", gap: "0.35rem", alignItems: "center",
              fontWeight: scope === "inbox" ? 800 : 500,
              borderColor: scope === "inbox" ? "var(--color-brand)" : undefined
            }}
          >
            <Inbox size={14} /> Surat Masuk
          </Link>
          <Link
            href="/member/surat-keluar"
            className="btn btn-white"
            style={{
              fontSize: "0.82rem",
              display: "inline-flex", gap: "0.35rem", alignItems: "center",
              fontWeight: scope === "outbox" ? 800 : 500,
              borderColor: scope === "outbox" ? "var(--color-brand)" : undefined
            }}
          >
            <Send size={14} /> Surat Keluar
          </Link>
        </div>

        {errorMsg ? (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem", borderLeft: "4px solid #dc2626" }}>
            <h3 style={{ margin: "0 0 0.5rem", color: "#991b1b", fontSize: "1.05rem" }}>Kotak Surat Gagal Dimuat</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>{errorMsg}</p>
            <button onClick={load} className="btn btn-primary">Coba Lagi</button>
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", background: "var(--color-surface-muted)" }}>
            <Mail size={32} style={{ color: "var(--color-muted)", margin: "0 auto 1rem", display: "block" }} />
            <h3 style={{ margin: "0 0 0.5rem", color: "var(--color-ink)" }}>{copy.emptyTitle}</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginBottom: "1.5rem", maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
              {copy.emptyBody}
            </p>
            {scope === "outbox" ? (
              <Link href="/surat/tulis" className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                <PenLine size={15} /> Tulis Surat Pertamamu
              </Link>
            ) : (
              <Link href="/surat/pool" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                <Mail size={15} /> Balas Surat Kawan
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((thread) => {
              const mod = thread.delivery_mode === "special" ? specialHandlingBadge(thread.handling_status) : moderationBadge(thread.moderation_status);
              const thr = threadBadge(thread.status);
              return (
                <div key={thread.id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 220, flex: 1 }}>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        <span className="pill" style={{ fontSize: "0.72rem", background: "#e0e7ff", color: "#3730a3" }}>
                          {thread.delivery_mode === "special" ? (scope === "inbox" ? "Balasan surat privat" : "Surat privat") : copy.itemLabel}
                        </span>
                        <span className="pill muted" style={{ fontSize: "0.72rem" }}>{thread.topic}</span>
                        {mod && (
                          <span className="pill" style={{ fontSize: "0.72rem", background: mod.bg, color: mod.color }}>
                            {mod.label}
                          </span>
                        )}
                        {thr && (
                          <span className="pill" style={{ fontSize: "0.72rem", background: thr.bg, color: thr.color, display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                            {thread.status === "blocked" && <Lock size={11} />} {thr.label}
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.02rem", color: "var(--color-ink)" }}>
                        {thread.title || "Surat tanpa judul"}
                      </h3>

                      <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "var(--color-ink)", lineHeight: 1.6 }}>
                        {thread.preview.length > 160 ? `${thread.preview.slice(0, 160)}...` : thread.preview}
                      </p>

                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.78rem", color: "var(--color-muted)" }}>
                        <span>
                          {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(thread.created_at))}
                        </span>
                        <span>
                          {scope === "inbox" ? `Dari: ${thread.author_alias}` : `Thread #${thread.id.slice(0, 8)}`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 170 }}>
                      <Link
                        href={`/surat/${thread.id}`}
                        className="btn btn-white"
                        style={{ fontSize: "0.8rem", justifyContent: "center", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}
                      >
                        Buka Percakapan <ArrowRight size={13} />
                      </Link>
                      {thread.status === "open" && thread.delivery_mode === "public" && (
                        <Link
                          href={`/surat/${thread.id}/balas`}
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", justifyContent: "center", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}
                        >
                          <Mail size={13} /> Balas
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: "2rem", fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", gap: "0.4rem", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <ShieldCheck size={14} /> Hanya kamu dan moderator yang bisa melihat percakapan ini.
        </div>
      </section>
      <Footer />
    </main>
  );
}
