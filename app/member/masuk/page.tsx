"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/PublicChrome";
import { getSupabaseClient } from "@/lib/supabase";
import { HeartHandshake, ShieldCheck, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg("Koneksi database tidak tersedia.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setErrorMsg("Email atau kata sandi belum sesuai. Silakan periksa kembali.");
        return;
      }

      if (data.session) {
        window.location.href = "/member";
      } else {
        setErrorMsg("Sesi login belum aktif. Coba beberapa saat lagi.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kendala saat masuk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section" style={{ maxWidth: 440, margin: "0 auto", padding: "3rem 1.25rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span className="pill" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
            <HeartHandshake size={14} /> Ruang Member
          </span>
          <h1 style={{ fontSize: "1.75rem", color: "var(--color-ink)", marginTop: "0.5rem" }}>
            Selamat Datang Kembali
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Masuk untuk membuka kotak surat dan melanjutkan ceritamu.
          </p>
        </div>

        <form onSubmit={handleLogin} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.75rem" }}>
          <label className="field">
            <span>Email Terdaftar</span>
            <input
              type="email"
              required
              placeholder="kamu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Kata Sandi</span>
            <input
              type="password"
              required
              placeholder="Kata sandi akunmu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {errorMsg && (
            <div style={{ padding: "0.6rem 0.8rem", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.85rem" }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: "center", display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
            <LogIn size={16} /> {loading ? "Memverifikasi..." : "Masuk ke Ruang Member"}
          </button>

          <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--color-muted)", paddingTop: "0.5rem" }}>
            Belum punya akun? <Link href="/member/daftar" style={{ color: "var(--color-brand-strong)", fontWeight: 700 }}>Daftar di sini</Link>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)", fontSize: "0.8rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>
          <ShieldCheck size={14} /> Privasi dan riwayat ceritamu terlindungi
        </div>
      </section>
      <Footer />
    </main>
  );
}