"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/PublicChrome";
import { getSupabaseClient } from "@/lib/supabase";
import { AvatarStudio } from "@/components/AvatarStudio";
import { defaultAvatarConfig, AvatarConfig, sanitizeAlias } from "@/lib/member";
import { ShieldCheck, HeartHandshake, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("Teman Teduh");
  const [avatar, setAvatar] = useState<AvatarConfig>(defaultAvatarConfig);
  const [agreedAge, setAgreedAge] = useState(false);
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanAlias = sanitizeAlias(alias);
    if (cleanAlias.length < 3) {
      setErrorMsg("Nama samaran (alias) minimal 3 karakter.");
      return;
    }

    if (!agreedAge || !agreedGuidelines) {
      setErrorMsg("Mohon konfirmasi batasan usia (18+) dan etika ruang cerita.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg("Koneksi ke sistem akun tidak tersedia.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            alias: cleanAlias,
            avatar_config: avatar
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        window.location.href = "/member";
      } else {
        setSuccessMsg("Pendaftaran berhasil! Akun kamu sudah siap. Mengalihkan ke halaman masuk...");
        setTimeout(() => {
          window.location.href = "/member/masuk";
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section" style={{ maxWidth: 840, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span className="pill" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
            <HeartHandshake size={14} /> Ruang Member QONSULIN.ID
          </span>
          <h1 style={{ fontSize: "2rem", color: "var(--color-ink)", marginTop: "0.5rem" }}>
            Buat Ruang Cerita Anonimmu
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
            Email dan identitas aslimu terjaga privat. Hanya nama samaran dan avatarmu yang terlihat.
          </p>
        </div>

        <form onSubmit={handleRegister} className="card" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.75rem", padding: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {/* Left: Account credentials */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-brand-strong)" }}>1. Data Akun Privat</h3>
              <label className="field">
                <span>Email Pribadi (Untuk Login)</span>
                <input
                  type="email"
                  required
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>Tidak akan pernah ditampilkan ke publik</small>
              </label>

              <label className="field">
                <span>Kata Sandi</span>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Nama Samaran (Alias Publik)</span>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teman Teduh, Kucing Hujan"
                  maxLength={30}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
                <small style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>Nama ini yang tampil saat menulis/membalas surat</small>
              </label>

              <div style={{ borderTop: "1px solid var(--color-rule)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agreedAge}
                    onChange={(e) => setAgreedAge(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>Saya menyatakan berusia minimal <strong>18 tahun</strong>.</span>
                </label>

                <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agreedGuidelines}
                    onChange={(e) => setAgreedGuidelines(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>Saya mengerti Qonsulin adalah ruang empati (bukan layanan darurat medis) dan setuju menjaga privasi sesama kawan cerita.</span>
                </label>
              </div>
            </div>

            {/* Right: Interactive Avatar Customizer */}
            <div>
              <h3 style={{ fontSize: "1.1rem", color: "var(--color-brand-strong)", marginBottom: "0.75rem" }}>2. Pilih Wajah Anonimmu</h3>
              <AvatarStudio value={avatar} onChange={setAvatar} alias={alias} />
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: "0.75rem 1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "0.88rem" }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: "8px", fontSize: "0.88rem" }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", maxWidth: 360, justifyContent: "center", display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
              <UserPlus size={16} /> {loading ? "Mendaftarkan Akun..." : "Daftar & Masuk Ruang Member"}
            </button>
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
              Sudah punya akun? <Link href="/member/masuk" style={{ color: "var(--color-brand-strong)", fontWeight: 700 }}>Masuk di sini</Link>
            </p>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)", fontSize: "0.8rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>
          <ShieldCheck size={14} /> Data tersimpan aman dengan enkripsi Row-Level Security
        </div>
      </section>
      <Footer />
    </main>
  );
}