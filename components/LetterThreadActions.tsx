"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Ban, X, Flag, Loader2, CheckCircle, XCircle
} from "lucide-react";
import {
  reportLetterThread,
  blockLetterThread,
  closeLetterThread,
  reportCategoryLabels,
  ReportCategory
} from "@/lib/letters";

type Props = {
  threadId: string;
  threadStatus: "open" | "closed" | "blocked" | "flagged";
  asParticipant: boolean;
  onActionComplete: (action: string) => void;
};

const reasonOptions: ReportCategory[] = [
  "personal_data", "harassment", "hate_speech",
  "sexual_content", "spam", "crisis", "other"
];

export function LetterThreadActions({ threadId, threadStatus, asParticipant, onActionComplete }: Props) {
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [reason, setReason] = useState<ReportCategory>("other");
  const [detail, setDetail] = useState("");

  async function doReport() {
    setLoading(true);
    setFeedback(null);
    const res = await reportLetterThread(threadId, reason, detail);
    setLoading(false);
    setFeedback({ ok: res.ok, message: res.message || (res.ok ? "Laporan berhasil dikirim. Terima kasih telah menjaga komunitas tetap aman." : "Laporan gagal dikirim.") });
    if (res.ok) {
      setShowReport(false);
      onActionComplete("report");
    }
  }

  async function doBlock() {
    setLoading(true);
    setFeedback(null);
    const res = await blockLetterThread(threadId);
    setLoading(false);
    setFeedback({ ok: res.ok, message: res.message || (res.ok ? "Thread diblokir dan disembunyikan dari daftarmu." : "Blokir gagal.") });
    if (res.ok) {
      setConfirmBlock(false);
      onActionComplete("block");
    }
  }

  async function doClose() {
    setLoading(true);
    setFeedback(null);
    const res = await closeLetterThread(threadId);
    setLoading(false);
    setFeedback({ ok: res.ok, message: res.message || (res.ok ? "Percakapan ditutup. Thread tidak lagi menerima balasan." : "Gagal menutup thread.") });
    if (res.ok) {
      setConfirmClose(false);
      onActionComplete("close");
    }
  }

  if (threadStatus === "closed" || threadStatus === "blocked") {
    return null;
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
      {/* Feedback toast */}
      {feedback && (
        <div
          style={{
            width: "100%", padding: "0.5rem 0.75rem",
            borderRadius: 6, fontSize: "0.82rem",
            background: feedback.ok ? "#dcfce7" : "#fee2e2",
            color: feedback.ok ? "#166534" : "#991b1b",
            display: "flex", gap: "0.4rem", alignItems: "center"
          }}
        >
          {feedback.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {feedback.message}
          <button
            onClick={() => setFeedback(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}
          >
            <XCircle size={13} />
          </button>
        </div>
      )}

      <button
        onClick={() => setShowReport(true)}
        className="btn btn-white"
        style={{ fontSize: "0.78rem", display: "inline-flex", gap: "0.3rem", alignItems: "center", color: "#b45309" }}
      >
        <Flag size={13} /> Laporkan Thread
      </button>

      {asParticipant && (
        <button
          onClick={() => setConfirmBlock(true)}
          className="btn btn-white"
          style={{ fontSize: "0.78rem", display: "inline-flex", gap: "0.3rem", alignItems: "center", color: "#dc2626" }}
        >
          <Ban size={13} /> Blokir & Sembunyikan
        </button>
      )}

      {asParticipant && (
        <button
          onClick={() => setConfirmClose(true)}
          className="btn btn-soft"
          style={{ fontSize: "0.78rem", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
        >
          <X size={13} /> Tutup Percakapan
        </button>
      )}

      {/* Report Modal */}
      {showReport && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "1rem"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}
        >
          <div className="card" style={{ maxWidth: 480, width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <AlertTriangle size={16} style={{ color: "#b45309" }} />
              Laporkan Thread Ini
            </h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Laporanmu hanya dilihat oleh moderator. Identitasmu tidak ditampilkan kepada pihak yang dilaporkan.
            </p>
            <label className="field">
              <span>Alasan Pelaporan *</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportCategory)}
                style={{ width: "100%" }}
              >
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>{reportCategoryLabels[r]}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginTop: "0.75rem" }}>
              <span>Detail Tambahan (opsional)</span>
              <textarea
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Jelaskan secara singkat mengapa thread ini perlu ditinjau moderator..."
              />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button
                onClick={() => { setShowReport(false); setFeedback(null); }}
                className="btn btn-white"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={doReport}
                className="btn btn-primary"
                disabled={loading}
                style={{ background: "#b45309", minWidth: 100 }}
              >
                {loading ? <Loader2 size={14} className="spin" /> : "Kirim Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Confirm */}
      {confirmBlock && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "1rem"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmBlock(false); }}
        >
          <div className="card" style={{ maxWidth: 400, width: "100%", padding: "1.5rem", textAlign: "center" }}>
            <AlertTriangle size={32} style={{ color: "#dc2626", margin: "0 auto 1rem" }} />
            <h3 style={{ color: "#991b1b", margin: "0 0 0.75rem" }}>Blokir & Sembunyikan Thread?</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              Thread ini akan disembunyikan dari tampilanmu. Pesan-pesannya tetap tersimpan untuk audit moderator. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button onClick={() => setConfirmBlock(false)} className="btn btn-white">Batal</button>
              <button onClick={doBlock} className="btn btn-primary" disabled={loading} style={{ background: "#dc2626", minWidth: 100 }}>
                {loading ? <Loader2 size={14} className="spin" /> : "Ya, Blokir Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {confirmClose && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: "1rem"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmClose(false); }}
        >
          <div className="card" style={{ maxWidth: 400, width: "100%", padding: "1.5rem", textAlign: "center" }}>
            <X size={32} style={{ color: "var(--color-brand)", margin: "0 auto 1rem" }} />
            <h3 style={{ margin: "0 0 0.75rem" }}>Tutup Percakapan?</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              Thread ini tidak akan menerima balasan baru. Tindakan ini tidak reversible.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button onClick={() => setConfirmClose(false)} className="btn btn-white">Batal</button>
              <button onClick={doClose} className="btn btn-primary" disabled={loading} style={{ minWidth: 100 }}>
                {loading ? <Loader2 size={14} className="spin" /> : "Ya, Tutup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
