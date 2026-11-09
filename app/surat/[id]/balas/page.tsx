"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { MemberProfile } from "@/lib/member";
import { getThreadDetail, getActiveTemplates, LetterThreadDetail, LetterTemplate, defaultTemplates } from "@/lib/letters";
import { LetterEnvelopeView } from "@/components/LetterEnvelopeView";
import { ArrowLeft, Send, Heart, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ReplyLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const threadId = resolvedParams.id;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [thread, setThread] = useState<LetterThreadDetail | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>(defaultTemplates);

  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("vintage_parchment");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const p = await getCurrentMemberProfile();
        if (!active) return;
        if (!p) {
          router.replace("/member/masuk");
          return;
        }
        setProfile(p);

        const [tDetail, tpls] = await Promise.all([
          getThreadDetail(threadId),
          getActiveTemplates()
        ]);
        if (!active) return;

        setThread(tDetail);
        setTemplates(tpls);
      } catch (err) {
        console.warn("Error loading reply page:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [threadId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (content.trim().length < 10) {
      setErrorMsg("Isi surat balasan minimal 10 karakter ya.");
      return;
    }

    setSending(true);
    try {
      const supabase = getSupabaseClient() as any;
      if (!supabase) {
        setErrorMsg("Koneksi database tidak tersedia.");
        return;
      }

      const repType = "community";

      const { data, error } = await supabase.rpc("send_reply_letter", {
        p_thread_id: threadId,
        p_content: content.trim(),
        p_template_code: selectedTemplate,
        p_reply_type: repType
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.message || "Gagal mengirimkan balasan surat.");
        return;
      }

      setSuccessMsg("Balasan tersimpan dan menunggu moderasi admin sebelum ditampilkan. Balasan tidak mengurangi kuota surat pembuka.");
      setContent("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala saat mengirim balasan.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ color: "var(--color-muted)" }}>Membuka surat kawan cerita...</p>
        </section>
        <Footer />
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ maxWidth: 540, margin: "3rem auto", textAlign: "center" }}>
          <div className="card" style={{ padding: "2.5rem 1.5rem" }}>
            <h2>Surat Tidak Ditemukan</h2>
            <p style={{ color: "var(--color-muted)", margin: "1rem 0 1.5rem" }}>
              Surat yang ingin kamu balas mungkin telah diarsipkan atau dipindahkan.
            </p>
            <Link href="/surat/pool" className="btn btn-primary">
              Kembali ke Kolam Surat
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const isPremiumUser = profile?.tier === "premium";

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 840, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/surat/${threadId}`} style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", color: "var(--color-brand-strong)", fontSize: "0.88rem", fontWeight: 700 }}>
            <ArrowLeft size={16} /> Kembali ke Utas Surat
          </Link>
          <h1 style={{ fontSize: "1.85rem", color: "var(--color-ink)", marginTop: "0.5rem" }}>
            Balas dengan Surat Penguat
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.92rem" }}>
            Tulis balasan empati untuk <strong>{thread.opening_letter.author_alias}</strong>. Balasan ini tidak mengurangi kuota surat bulananmu.
          </p>
        </div>

        {/* Original Letter Preview */}
        <div style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-muted)", display: "block", marginBottom: "0.5rem" }}>
            Surat yang Sedang Kamu Balas:
          </span>
          <LetterEnvelopeView
            templateCode={thread.opening_letter.template_code}
            topic={thread.topic}
            title={thread.opening_letter.title}
            content={thread.opening_letter.content}
            authorAlias={thread.opening_letter.author_alias}
            authorAvatar={thread.opening_letter.author_avatar}
            dateStr={new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(thread.opening_letter.created_at))}
            defaultOpen={true}
          />
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 style={{ fontSize: "1.2rem", color: "var(--color-ink)", margin: 0, display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <Heart size={18} style={{ color: "var(--color-brand)" }} /> Tuliskan Balasanmu dari Hati
          </h3>

          {/* Template Selection */}
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>
              Pilih Tema Kertas Balasan
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
              {templates.map((tpl) => {
                const locked = tpl.tier_required === "premium" && !isPremiumUser;
                const active = selectedTemplate === tpl.code;

                return (
                  <button
                    type="button"
                    key={tpl.code}
                    onClick={() => {
                      if (!locked) setSelectedTemplate(tpl.code);
                    }}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: 8,
                      border: active ? "2px solid var(--color-brand)" : "1px solid var(--color-rule)",
                      background: active ? "var(--color-surface-muted)" : "white",
                      textAlign: "left",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.6 : 1,
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: tpl.wax_seal_color }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{tpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="field">
            <span>Isi Surat Balasan *</span>
            <textarea
              required
              rows={7}
              minLength={10}
              placeholder="Berikan kata-kata penguat, refleksi, atau cerita singkat serupa yang dapat meringankan bebannya..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
            />
            <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>
              Jaga etika empati: dengarkan tanpa menghakimi dan hindari memberikan diagnosa medis kaku.
            </small>
          </label>

          {errorMsg && (
            <div style={{ padding: "0.75rem 1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontSize: "0.88rem" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: 8, fontSize: "0.88rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid var(--color-rule)", paddingTop: "1.25rem" }}>
            <Link href={`/surat/${threadId}`} className="btn btn-white">
              Batal
            </Link>
            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary"
              style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}
            >
              <Send size={15} /> {sending ? "Mengirimkan Balasan..." : "Kirim Surat Balasan"}
            </button>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)", fontSize: "0.8rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>
          <ShieldCheck size={14} /> Balasan tetap anonim dan aman terlindungi
        </div>
      </section>
      <Footer />
    </main>
  );
}
