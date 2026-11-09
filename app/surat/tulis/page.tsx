"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMemberProfile } from "@/lib/member-auth";
import { MemberProfile } from "@/lib/member";
import { getActiveTemplates, getMemberQuota, LetterTemplate, LetterQuota, defaultTemplates } from "@/lib/letters";
import { LetterEnvelopeView } from "@/components/LetterEnvelopeView";
import { Mail, ArrowLeft, Send, Sparkles, ShieldAlert, CheckCircle2, Lock } from "lucide-react";

const TOPIC_OPTIONS = [
  "Luapan Hati",
  "Kecemasan Masa Depan",
  "Tekanan Skripsi & Kuliah",
  "Hubungan & Patah Hati",
  "Burnout & Kelelahan Kerja",
  "Kesepian & Hampa"
];

export default function WriteLetterPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [quota, setQuota] = useState<LetterQuota | null>(null);
  const [templates, setTemplates] = useState<LetterTemplate[]>(defaultTemplates);

  const [topic, setTopic] = useState("Luapan Hati");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("vintage_parchment");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

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

        const [q, tpls] = await Promise.all([getMemberQuota(), getActiveTemplates()]);
        if (!active) return;
        setQuota(q);
        setTemplates(tpls);
      } catch (err) {
        console.warn("Failed to load write page:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (content.trim().length < 10) {
      setErrorMsg("Isi surat batin minimal 10 karakter ya.");
      return;
    }

    if (quota && !quota.can_send) {
      setErrorMsg("Kuota surat batinmu bulan ini sudah mencapai batas (3/3). Tingkatkan ke Premium untuk menulis tanpa batas.");
      return;
    }

    setSending(true);
    try {
      const supabase = getSupabaseClient() as any;
      if (!supabase) {
        setErrorMsg("Koneksi database tidak tersedia.");
        return;
      }

      const { data, error } = await supabase.rpc("send_opening_letter", {
        p_topic: topic,
        p_title: title.trim() || null,
        p_content: content.trim(),
        p_template_code: selectedTemplate
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data?.ok) {
        setErrorMsg(data?.message || "Gagal mengapungkan surat ke kolam.");
        return;
      }

      if (data.is_crisis_hold) {
        setSuccessMsg("Suratmu telah tersimpan dan ditahan untuk pemeriksaan khusus. Surat belum dipublikasikan. Layanan ini bukan layanan darurat dan tidak menjamin respons segera.");
      } else {
        setSuccessMsg("Suratmu tersimpan dan menunggu moderasi admin. Setelah disetujui, surat akan tampil di Kolam Surat. Kuota bulan ini sudah diperbarui.");
      }

      setContent("");
      setTitle("");
      setQuota(await getMemberQuota());
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala saat mengirim surat.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ color: "var(--color-muted)" }}>Menyiapkan meja tulismu...</p>
        </section>
        <Footer />
      </main>
    );
  }

  const currentTpl = templates.find((t) => t.code === selectedTemplate) || templates[0];
  const isPremiumUser = profile?.tier === "premium";

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 840, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {/* Navigation & Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/member" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", color: "var(--color-brand-strong)", fontSize: "0.88rem", fontWeight: 700 }}>
            <ArrowLeft size={16} /> Kembali ke Ruang Member
          </Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginTop: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.85rem", color: "var(--color-ink)", margin: 0 }}>
                Tulis Surat Batin Baru
              </h1>
              <p style={{ color: "var(--color-muted)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
                Apungkan isi hatimu ke Kolam Komunitas secara 100% anonim.
              </p>
            </div>

            {/* Quota indicator */}
            <div className="card" style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span>Sisa Kuota Bulan Ini:</span>
              <strong style={{ color: "var(--color-brand-strong)", fontWeight: 800 }}>
                {isPremiumUser ? "Tanpa Batas (Premium)" : `${quota?.remaining ?? 3} / 3 Surat`}
              </strong>
            </div>
          </div>
        </div>

        {/* Security / Community Guideline Note */}
        <div style={{ background: "#fffbeb", border: "1px solid #fef08a", borderRadius: 8, padding: "0.9rem 1.1rem", marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.85rem", color: "#854d0e" }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Jaga Privasimu:</strong> Dilarang mencantumkan nama asli, nomor telepon, akun media sosial, atau petunjuk identitas pribadi dalam isi surat.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {/* Topic Select */}
            <label className="field">
              <span>Topik Masalah / Perasaan</span>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPIC_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            {/* Title (Optional) */}
            <label className="field">
              <span>Judul Surat (Opsional)</span>
              <input
                type="text"
                placeholder="Misal: Lelah yang sulit kujelaskan..."
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>

          {/* Template Selection */}
          <div>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>
              Pilih Tema Kertas Digital & Cap Segel
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
                      if (locked) {
                        setErrorMsg("Tema ini eksklusif untuk Member Premium. Upgrade untuk membukanya.");
                        return;
                      }
                      setSelectedTemplate(tpl.code);
                    }}
                    style={{
                      padding: "0.75rem",
                      borderRadius: 8,
                      border: active ? "2px solid var(--color-brand)" : "1px solid var(--color-rule)",
                      background: active ? "var(--color-surface-muted)" : "white",
                      textAlign: "left",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.6 : 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: tpl.wax_seal_color }} />
                      {locked && <Lock size={13} style={{ color: "var(--color-muted)" }} />}
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-ink)" }}>{tpl.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                      {tpl.tier_required === "premium" ? "★ Premium" : "Free"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <label className="field">
            <span>Isi Surat Batin *</span>
            <textarea
              required
              rows={8}
              minLength={10}
              placeholder="Tuliskan segala hal yang mengganjal di batinmu tanpa takut dihakimi..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
            />
            <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>
              Minimal 10 karakter. Pengguna lain di Kolam Komunitas dapat membaca dan membalas suratmu dengan surat juga.
            </small>
          </label>

          {/* Toggle Live Preview */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-white"
              style={{ fontSize: "0.82rem", minHeight: 34, padding: "0.3rem 0.8rem" }}
            >
              <Sparkles size={14} /> {showPreview ? "Sembunyikan Pratinjau Amplop" : "Lihat Pratinjau Amplop"}
            </button>
          </div>

          {showPreview && (
            <div style={{ borderTop: "1px dashed var(--color-rule)", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--color-muted)", display: "block", marginBottom: "0.5rem" }}>
                Pratinjau Tampilan di Kolam Komunitas:
              </span>
              <LetterEnvelopeView
                templateCode={selectedTemplate}
                waxSealColor={currentTpl.wax_seal_color}
                topic={topic}
                title={title || "Surat Batin Dari Teman Anonim"}
                content={content || "Isi surat batinmu akan tampil di sini saat dibuka oleh teman di kolam..."}
                authorAlias={profile?.alias || "Teman Teduh"}
                authorAvatar={profile?.avatar_config}
                defaultOpen={true}
              />
            </div>
          )}

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

          {/* Submit Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid var(--color-rule)", paddingTop: "1.25rem" }}>
            <Link href="/member" className="btn btn-white">
              Batal
            </Link>
            <button
              type="submit"
              disabled={sending || (quota !== null && !quota.can_send)}
              className="btn btn-primary"
              style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}
            >
              <Send size={15} /> {sending ? "Mengapungkan Surat..." : "Kirim untuk Moderasi"}
            </button>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
