"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getPoolLetters, LetterItem } from "@/lib/letters";
import { LetterEnvelopeView } from "@/components/LetterEnvelopeView";
import { Mail, HeartHandshake, PenLine, Filter, RefreshCw, Sparkles } from "lucide-react";

export default function LetterPoolPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Semua Topik");

  const loadLetters = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getPoolLetters();
      setLetters(data);
    } catch (e: any) {
      console.warn("Error loading pool letters:", e);
      setErrorMsg(e?.message || "Kolam surat gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLetters();
  }, []);

  const topics = ["Semua Topik", ...Array.from(new Set(letters.map((l) => l.topic || "Luapan Hati")))];
  const filteredLetters = selectedTopic === "Semua Topik" ? letters : letters.filter((l) => l.topic === selectedTopic);

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {/* Banner Section */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <span className="pill" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <HeartHandshake size={14} /> Kolam Surat Komunitas QONSULIN.ID
          </span>
          <h1 style={{ fontSize: "2.25rem", color: "var(--color-ink)", margin: 0 }}>
            Ruang Surat Katarsis Anonim
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "1rem", maxWidth: 620, margin: "0.75rem auto 1.5rem", lineHeight: 1.6 }}>
            Buka amplop surat dari kawan yang sedang berjuang melewati badai serupa. Bacalah dengan tulus dan kirimkan balasan penguat tanpa stigma.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/surat/tulis" className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
              <PenLine size={16} /> Tulis & Apungkan Surat Baru
            </Link>
            <Link href="/member" className="btn btn-white" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
              <Mail size={16} /> Ke Ruang Member Saya
            </Link>
          </div>
        </div>

        {/* Filters and Refresh Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem", borderBottom: "1px solid var(--color-rule)", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--color-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Filter size={14} /> Saring:
            </span>
            {topics.map((top) => (
              <button
                key={top}
                onClick={() => setSelectedTopic(top)}
                className={`pill ${selectedTopic === top ? "" : "muted"}`}
                style={{
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  background: selectedTopic === top ? "var(--color-brand)" : undefined,
                  color: selectedTopic === top ? "white" : undefined,
                  border: "none"
                }}
              >
                {top}
              </button>
            ))}
          </div>

          <button
            onClick={loadLetters}
            disabled={loading}
            className="btn btn-white"
            style={{ fontSize: "0.8rem", minHeight: 32, padding: "0.2rem 0.6rem", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Perbarui Kolam
          </button>
        </div>

        {/* Letters Stream */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-muted)" }}>
            <p>Mendengarkan gema cerita dari kolam...</p>
          </div>
        ) : errorMsg ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem", borderLeft: "4px solid #dc2626" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#991b1b", marginBottom: "0.5rem" }}>Kolam Surat Gagal Dimuat</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 1.5rem" }}>{errorMsg}</p>
            <button onClick={loadLetters} className="btn btn-primary">Coba Lagi</button>
          </div>
        ) : filteredLetters.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <Mail size={36} style={{ color: "var(--color-muted)", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.2rem", color: "var(--color-ink)", marginBottom: "0.5rem" }}>
              Kolam Surat Masih Hening
            </h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 1.5rem" }}>
              Belum ada surat batin untuk kategori ini. Jadilah yang pertama mengapungkan surat ke kolam.
            </p>
            <Link href="/surat/tulis" className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem" }}>
              <PenLine size={15} /> Tulis Surat Batin Sekarang
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filteredLetters.map((letter) => (
              <div key={letter.id} className="card" style={{ padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                      <span className="pill" style={{ fontSize: "0.72rem" }}>{letter.topic}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                        {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(letter.created_at))}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--color-ink)" }}>
                      {letter.title || "Surat Batin Dari Teman Anonim"}
                    </h3>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                      Ditulis oleh <strong>{letter.author_alias}</strong>
                    </p>
                    <p style={{ margin: "0.6rem 0 0", fontSize: "0.9rem", color: "var(--color-ink)", lineHeight: 1.6 }}>
                      {letter.content.length > 180 ? `${letter.content.slice(0, 180)}...` : letter.content}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 190 }}>
                    <Link
                      href={`/surat/${letter.thread_id}`}
                      className="btn btn-white"
                      style={{ fontSize: "0.82rem", justifyContent: "center", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}
                    >
                      <Mail size={14} /> Buka Thread
                    </Link>
                    <Link
                      href={`/surat/${letter.thread_id}/balas`}
                      className="btn btn-primary"
                      style={{ fontSize: "0.82rem", justifyContent: "center", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}
                    >
                      <HeartHandshake size={14} /> Balas Surat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}