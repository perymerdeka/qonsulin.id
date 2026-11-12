"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        setErrorMsg(error.message.toLowerCase().includes("email not confirmed")
          ? "Email belum dikonfirmasi. Hubungi admin jika masih belum bisa masuk."
          : "Email atau kata sandi belum sesuai. Silakan periksa kembali.");
        return;
      }

      if (data.session) {
        window.location.href = "/member";
      } else {
        setErrorMsg("Sesi login belum aktif. Coba beberapa saat lagi.");
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Terjadi kendala saat masuk.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="member-login">
      <div className="member-login-card">
        <div className="member-login-brand">
          <Link href="/" className="member-login-logo" aria-label="QONSULIN.ID Beranda">
            <span className="member-brand-mark">Q</span> QONSULIN.ID
          </Link>
          <h1>RUANG MEMBER</h1>
          <p>Masuk untuk membuka kotak surat dan melanjutkan ceritamu.</p>
        </div>

        <div className="member-login-panel">
          <form onSubmit={handleLogin}>
            <label className="field">
              <span>Email Terdaftar</span>
              <input type="email" required autoComplete="email" placeholder="kamu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Kata Sandi</span>
              <input type="password" required autoComplete="current-password" placeholder="Kata sandi akunmu" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {errorMsg && <p className="member-login-error" role="alert">{errorMsg}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Memverifikasi..." : "Masuk ke Ruang Member"}
            </button>
          </form>
          <div className="member-login-note"><ShieldCheck size={16} /> Privasi dan riwayat ceritamu terlindungi</div>
        </div>

        <p className="member-login-links">
          Belum punya akun? <Link href="/member/daftar">Daftar di sini</Link>
        </p>
        <p className="member-login-back"><Link href="/">Kembali ke Website Qonsulin.id</Link></p>
      </div>
    </main>
  );
}
