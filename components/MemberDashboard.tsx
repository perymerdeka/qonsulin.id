"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CheckCircle2, Ellipsis, Flag, Globe2, Heart, Loader2, Mail, MessageCircle, PenLine, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { blockLetterThread, closeLetterThread, defaultTemplates, getActiveTemplates, getMemberLetterThreads, getPoolLetters, getThreadDetail, reportCategoryLabels, reportLetterThread, type LetterItem, type LetterQuota, type LetterTemplate, type LetterThreadDetail, type MemberThreadSummary, type ReportCategory } from "@/lib/letters";
import { getSupabaseClient } from "@/lib/supabase";
import type { PackageOrder } from "@/lib/packages";
import type { MemberNotification } from "@/components/MemberAppShell";
import { CrisisGuidance } from "@/components/CrisisGuidance";

type MemberDashboardProps = {
  alias?: string;
  memberId: string;
  tier?: "free" | "premium";
  quota: LetterQuota | null;
  orders: PackageOrder[];
  onLetterSent: () => Promise<void>;
  onNotificationsChange: (notifications: MemberNotification[]) => void;
};

type LetterTab = "mine" | "inbox" | "review" | "rejected";

function formatRelativeDate(value: string) {
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(difference / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(value));
}

function PaperPreview({ content, templateCode, compact = false, full = false, authorAlias, createdAt, topic }: { content: string; templateCode?: string; compact?: boolean; full?: boolean; authorAlias?: string; createdAt?: string; topic?: string }) {
  const code = templateCode || "vintage_parchment";
  const dateLabel = createdAt ? formatRelativeDate(createdAt) : "";
  return (
    <div className={`letter-paper-realistic paper-${code}${compact ? " is-compact" : ""}${full ? " is-full" : ""}`}>
      <div className="letterhead">
        <div className="letterhead-brand">
          <span className="letterhead-seal">Q</span>
          <div>
            <div className="letterhead-title">{topic || "Kolam Surat Qonsulin"}</div>
            <div className="letterhead-sub">Ruang Cerita & Tanggapan Anonim</div>
          </div>
        </div>
        {dateLabel && <div className="letterhead-date">{dateLabel}</div>}
      </div>
      <div className="letter-body-text">{content}</div>
      <div className="letter-signoff">
        <span className="letter-signoff-sender">Tertanda, {authorAlias || "Kawan Anonim"}</span>
        <span className="letter-signoff-quote">Disegel resmi</span>
      </div>
    </div>
  );
}

const reasonOptions: ReportCategory[] = [
  "personal_data", "harassment", "hate_speech",
  "sexual_content", "spam", "crisis", "other"
];

function ThreadDialog({ threadId, memberId, tier, onClose, onThreadUpdated }: { threadId: string; memberId: string; tier?: "free" | "premium"; onClose: () => void; onThreadUpdated?: () => void }) {
  const [thread, setThread] = useState<LetterThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyTemplate, setReplyTemplate] = useState("vintage_parchment");
  const [replySending, setReplySending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Safety actions state
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<ReportCategory>("other");
  const [reportDetail, setReportDetail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadThread() {
      setLoading(true);
      const detail = await getThreadDetail(threadId);
      if (active) {
        setThread(detail);
        setLoading(false);
      }
    }
    void loadThread();
    return () => { active = false; };
  }, [threadId]);

  async function handleSendReply() {
    if (replyContent.trim().length < 10) {
      setFeedback({ ok: false, message: "Balasan surat minimal 10 karakter." });
      return;
    }
    setReplySending(true);
    setFeedback(null);
    try {
      const supabase = getSupabaseClient() as any;
      if (!supabase) {
        setFeedback({ ok: false, message: "Koneksi database tidak tersedia." });
        return;
      }
      const { data, error } = await supabase.rpc("send_reply_letter", {
        p_thread_id: threadId,
        p_content: replyContent.trim(),
        p_template_code: replyTemplate,
        p_reply_type: "community"
      });
      if (error || !data?.ok) {
        setFeedback({ ok: false, message: data?.message || error?.message || "Gagal mengirimkan balasan surat." });
        return;
      }
      setFeedback({
        ok: true,
        message: data.is_crisis_hold
          ? "Balasan tersimpan untuk peninjauan khusus dan belum dipublikasikan."
          : "Surat balasanmu berhasil terkirim dan menunggu moderasi sebelum tampil."
      });
      setReplyContent("");
      setReplyOpen(false);
      // Reload thread
      const updated = await getThreadDetail(threadId);
      if (updated) setThread(updated);
      if (onThreadUpdated) onThreadUpdated();
    } catch (e: any) {
      setFeedback({ ok: false, message: e?.message || "Terjadi kendala saat mengirim balasan." });
    } finally {
      setReplySending(false);
    }
  }

  async function handleReport() {
    setActionLoading(true);
    const res = await reportLetterThread(threadId, reportReason, reportDetail);
    setActionLoading(false);
    setFeedback({ ok: res.ok, message: res.message || (res.ok ? "Laporan berhasil dikirim ke moderator." : "Laporan gagal dikirim.") });
    if (res.ok) {
      setShowReport(false);
      setReportDetail("");
    }
  }

  async function handleCloseThread() {
    setActionLoading(true);
    const res = await closeLetterThread(threadId);
    setActionLoading(false);
    setFeedback({ ok: res.ok, message: res.message || (res.ok ? "Percakapan surat telah ditutup." : "Gagal menutup percakapan.") });
    if (res.ok) {
      setConfirmClose(false);
      const updated = await getThreadDetail(threadId);
      if (updated) setThread(updated);
      if (onThreadUpdated) onThreadUpdated();
    }
  }

  const isAuthor = thread?.opening_letter.sender_id === memberId;
  const isParticipant = isAuthor || Boolean(thread?.replies.some((r) => r.sender_id === memberId));

  return (
    <div className="member-thread-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="member-letter-sheet-dialog" role="dialog" aria-modal="true" aria-label="Surat dan lembar balasan">
        <button type="button" className="member-thread-close" onClick={onClose} aria-label="Tutup surat"><X size={19} /></button>

        {loading ? <p className="member-empty-state">Membuka lembaran surat...</p> : !thread ? <p className="member-empty-state">Surat tidak dapat dibuka.</p> : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
              <div>
                <p className="member-eyebrow" style={{ margin: 0 }}>SURAT RESMI &bull; {thread.delivery_mode === "special" ? "PRIVAT" : "KOLAM PUBLIK"}</p>
                <h2 style={{ margin: "0.25rem 0 0", fontSize: "1.45rem", color: "#1f1f1f" }}>{thread.topic}</h2>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {thread.delivery_mode === "public" && (
                  <button type="button" onClick={() => setShowReport(true)} className="btn btn-white" style={{ fontSize: "0.78rem", color: "#b45309", padding: "0.35rem 0.75rem", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                    <Flag size={13} /> Laporkan
                  </button>
                )}
                {isAuthor && thread.status === "open" && (
                  <button type="button" onClick={() => setConfirmClose(true)} className="btn btn-white" style={{ fontSize: "0.78rem", color: "#666", padding: "0.35rem 0.75rem", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                    <Ban size={13} /> Tutup Percakapan
                  </button>
                )}
              </div>
            </div>

            {feedback && (
              <div style={{ padding: "0.6rem 0.9rem", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem", background: feedback.ok ? "#dcfce7" : "#fee2e2", color: feedback.ok ? "#166534" : "#991b1b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {feedback.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>{feedback.message}</span>
                <button type="button" onClick={() => setFeedback(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={14} /></button>
              </div>
            )}

            {/* Opening Letter Paper */}
            <article className="member-thread-item">
              <PaperPreview
                content={thread.opening_letter.content}
                templateCode={thread.opening_letter.template_code}
                authorAlias={thread.opening_letter.author_alias || "Kawan Anonim"}
                createdAt={thread.opening_letter.created_at}
                topic={thread.topic}
                full
              />
            </article>

            {/* Replies Section */}
            <div className="member-thread-replies" style={{ marginTop: "2rem" }}>
              <h3><MessageCircle size={17} /> Lembar Balasan ({thread.replies.length})</h3>
              {thread.replies.length === 0 ? (
                <p style={{ color: "#777", fontSize: "0.88rem", fontStyle: "italic", margin: "1rem 0" }}>Belum ada lembar balasan untuk surat ini.</p>
              ) : (
                thread.replies.map((reply) => (
                  <article key={reply.id} className="member-thread-item" style={{ marginTop: "1rem" }}>
                    <PaperPreview
                      content={reply.content}
                      templateCode={reply.template_code}
                      authorAlias={reply.operator_reply ? "Tim Qonsulin" : (reply.author_alias || "Kawan Cerita")}
                      createdAt={reply.created_at}
                      topic={`Balasan untuk: ${thread.topic}`}
                      full
                    />
                  </article>
                ))
              )}
            </div>

            {/* In-Place Reply Box */}
            {thread.status === "open" && thread.delivery_mode === "public" && !isAuthor && (
              <div className="member-sheet-reply-box">
                {!replyOpen ? (
                  <button type="button" className="btn btn-primary" onClick={() => setReplyOpen(true)} style={{ display: "inline-flex", gap: "0.45rem", alignItems: "center" }}>
                    <PenLine size={16} /> Tuliskan Lembar Balasan
                  </button>
                ) : (
                  <div>
                    <h4><Heart size={16} style={{ color: "var(--color-brand)" }} /> Tuliskan Balasanmu Dari Hati</h4>
                    <p style={{ margin: "0 0 0.8rem", color: "#666", fontSize: "0.82rem" }}>Balasan akan disematkan sebagai lembaran kertas resmi dan dimoderasi demi keamanan komunitas.</p>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Tuliskan kata-kata penguat atau refleksi penuh empati..."
                      maxLength={3000}
                      rows={5}
                      disabled={replySending}
                      autoFocus
                    />
                    <div className="member-sheet-reply-actions">
                      <span style={{ fontSize: "0.78rem", color: "#888" }}>{replyContent.length}/3000 karakter</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="btn btn-white" onClick={() => setReplyOpen(false)} disabled={replySending}>Batal</button>
                        <button type="button" className="btn btn-primary" onClick={handleSendReply} disabled={replySending} style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                          {replySending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                          {replySending ? "Mengirim..." : "Kirim Lembar Balasan"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Report Modal */}
            {showReport && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
                <div style={{ maxWidth: 460, width: "100%", background: "white", borderRadius: 12, padding: "1.5rem", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
                  <h3 style={{ margin: "0 0 0.5rem", display: "flex", gap: "0.4rem", alignItems: "center", color: "#991b1b", fontSize: "1.1rem" }}>
                    <AlertTriangle size={17} /> Laporkan Surat Ini
                  </h3>
                  <p style={{ color: "#666", fontSize: "0.82rem", margin: "0 0 1rem" }}>Laporanmu bersifat rahasia dan langsung masuk ke antrean peninjauan moderator Qonsulin.</p>
                  <label className="field" style={{ display: "block", marginBottom: "0.85rem" }}>
                    <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>Alasan Pelaporan</span>
                    <select value={reportReason} onChange={(e) => setReportReason(e.target.value as ReportCategory)} style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc" }}>
                      {reasonOptions.map((r) => <option key={r} value={r}>{reportCategoryLabels[r]}</option>)}
                    </select>
                  </label>
                  <label className="field" style={{ display: "block", marginBottom: "1rem" }}>
                    <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>Keterangan Tambahan (opsional)</span>
                    <textarea rows={3} value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} placeholder="Berikan konteks singkat..." style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc", fontSize: "0.85rem" }} />
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-white" onClick={() => setShowReport(false)} disabled={actionLoading}>Batal</button>
                    <button type="button" className="btn btn-primary" onClick={handleReport} disabled={actionLoading} style={{ background: "#b45309" }}>{actionLoading ? "Mengirim..." : "Kirim Laporan"}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Close Thread Modal */}
            {confirmClose && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={(e) => { if (e.target === e.currentTarget) setConfirmClose(false); }}>
                <div style={{ maxWidth: 400, width: "100%", background: "white", borderRadius: 12, padding: "1.5rem", textAlign: "center" }}>
                  <AlertTriangle size={32} style={{ color: "#d97706", margin: "0 auto 0.75rem" }} />
                  <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Tutup Percakapan Surat?</h3>
                  <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 1.25rem" }}>Surat ini tidak akan menerima lembar balasan baru lagi.</p>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <button type="button" className="btn btn-white" onClick={() => setConfirmClose(false)} disabled={actionLoading}>Batal</button>
                    <button type="button" className="btn btn-primary" onClick={handleCloseThread} disabled={actionLoading}>Ya, Tutup Surat</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
function createNotifications(outbox: MemberThreadSummary[], inbox: MemberThreadSummary[]): MemberNotification[] {
  const replyNotifications = inbox.map((letter) => ({
    id: `reply-${letter.id}-${letter.created_at}`,
    title: "Ada balasan untuk suratmu",
    detail: `${letter.author_alias || "Kawan Cerita"} membalas surat yang kamu kirim.`,
    createdAt: letter.created_at
  }));
  const moderationNotifications = outbox.map((letter) => {
    if (letter.delivery_mode === "special") {
      const messages = {
        waiting: ["Surat privatmu sudah diterima", "Admin akan meninjau dan meneruskan surat kepada pendamping yang sesuai."],
        assigned: ["Surat privatmu sudah ditugaskan", "Admin sudah meneruskan surat kepada pendamping."],
        in_progress: ["Surat privatmu sedang diproses", "Pendampingan sedang ditangani oleh tim Qonsulin."],
        completed: ["Penanganan suratmu selesai", "Periksa Inbox untuk melihat balasan dari Tim Qonsulin."],
        needs_attention: ["Suratmu sedang ditinjau khusus", "Tim Qonsulin memberi perhatian tambahan pada surat privatmu."]
      } as const;
      const status = letter.handling_status || "waiting";
      const message = messages[status];
      return { id: "special-" + letter.id + "-" + status, title: message[0], detail: message[1], createdAt: letter.created_at };
    }

    const status = letter.moderation_status;
    const message = status === "approved"
      ? ["Suratmu sudah disetujui", "Suratmu kini tampil di Kolam Surat."]
      : status === "rejected"
        ? ["Suratmu tidak dapat dipublikasikan", "Silakan periksa kembali isi surat dan pedoman komunitas."]
        : status === "crisis_hold"
          ? ["Suratmu sedang ditinjau khusus", "Suratmu ditahan sementara untuk peninjauan yang lebih aman."]
          : ["Suratmu sedang dimoderasi", "Suratmu sedang ditinjau sebelum tampil di Kolam Surat."];
    return { id: "moderation-" + letter.id + "-" + status, title: message[0], detail: message[1], createdAt: letter.created_at };
  });
  return [...replyNotifications, ...moderationNotifications].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
}

export function MemberDashboard({ alias, memberId, tier, quota, orders, onLetterSent, onNotificationsChange }: MemberDashboardProps) {
  const [poolLetters, setPoolLetters] = useState<LetterItem[]>([]);
  const [outbox, setOutbox] = useState<MemberThreadSummary[]>([]);
  const [inbox, setInbox] = useState<MemberThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [activeTab, setActiveTab] = useState<LetterTab>("mine");
  const [selectedTemplate, setSelectedTemplate] = useState("vintage_parchment");
  const [deliveryMode, setDeliveryMode] = useState<"public" | "special">("public");
  const [destination, setDestination] = useState<"mentor" | "counselor">("mentor");
  const [templates, setTemplates] = useState<LetterTemplate[]>(defaultTemplates);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showCrisisGuidance, setShowCrisisGuidance] = useState(false);
  const composeDialogRef = useRef<HTMLDialogElement>(null);

  async function loadLists() {
    const [pool, myLetters, incomingLetters] = await Promise.all([getPoolLetters(), getMemberLetterThreads("outbox"), getMemberLetterThreads("inbox")]);
    setPoolLetters(pool.slice(0, 8));
    setOutbox(myLetters);
    setInbox(incomingLetters);
    onNotificationsChange(createNotifications(myLetters, incomingLetters));
  }

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        await loadLists();
        if (active) setFeedError(false);
      } catch (error) {
        console.warn("[MemberDashboard] Failed to load letters:", error);
        if (active) setFeedError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    void getActiveTemplates().then((items) => {
      if (active) {
        setTemplates(items);
        setSelectedTemplate((current) => items.some((item) => item.code === current) ? current : items.find((item) => item.tier_required === "free")?.code || items[0].code);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const dialog = composeDialogRef.current;
    if (!isComposeOpen || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isComposeOpen]);

  const visibleLetters = useMemo(() => {
    if (activeTab === "inbox") return inbox;
    if (activeTab === "review") return outbox.filter((letter) => letter.moderation_status === "pending" || letter.moderation_status === "crisis_hold");
    if (activeTab === "rejected") return outbox.filter((letter) => letter.moderation_status === "rejected");
    return outbox;
  }, [activeTab, inbox, outbox]);

  const template = templates.find((item) => item.code === selectedTemplate) || templates[0];
  const tabs: Array<{ id: LetterTab; label: string; count?: number }> = [
    { id: "mine", label: "Surat Saya" },
    { id: "inbox", label: "Inbox", count: inbox.length },
    { id: "review", label: "Dalam Tinjauan" },
    { id: "rejected", label: "Ditolak" }
  ];

  async function sendOpeningLetter() {
    setFeedback("");
    if (draft.trim().length < 10) {
      setFeedback("Isi surat minimal 10 karakter.");
      return;
    }
    if (deliveryMode === "public" && quota && !quota.can_send) {
      setFeedback("Kuota surat pembuka bulan ini sudah habis.");
      return;
    }

    const supabase = getSupabaseClient() as any;
    if (!supabase) {
      setFeedback("Koneksi database tidak tersedia.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = deliveryMode === "public"
        ? await supabase.rpc("send_opening_letter", { p_topic: "Luapan Hati", p_title: null, p_content: draft.trim(), p_template_code: selectedTemplate })
        : await supabase.rpc("send_special_letter", { p_destination: destination, p_title: null, p_content: draft.trim(), p_template_code: selectedTemplate });
      if (error || !data?.ok) {
        setFeedback(data?.message || error?.message || "Surat belum berhasil dikirim.");
        return;
      }
      setDraft("");
      setFeedback(data.is_crisis_hold ? "Surat tersimpan dan sedang ditinjau dengan perhatian khusus." : deliveryMode === "special" ? "Surat privat terkirim ke admin untuk diteruskan kepada pendamping." : "Surat terkirim dan menunggu moderasi sebelum tampil di Kolam Surat.");
      setIsComposeOpen(false);
      setShowCrisisGuidance(Boolean(data.is_crisis_hold));
      await Promise.all([loadLists(), onLetterSent()]);
      setActiveTab("mine");
      setIsComposeOpen(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Terjadi kendala saat mengirim surat.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="member-letter-dashboard">
      <section className="member-public-column">
        <div className="member-section-heading"><div><h1>Public Letter</h1></div></div>
        <div className="member-public-feed">
          {loading ? <p className="member-empty-state">Memuat surat publik...</p> : feedError ? <p className="member-empty-state">Surat belum bisa dimuat. Coba buka Kolam Surat.</p> : poolLetters.length === 0 ? <div className="member-empty-state"><Mail size={22} /> Belum ada surat publik untuk ditampilkan.</div> : poolLetters.map((letter) => (
            <article className="member-public-letter" key={letter.id}>
              <button type="button" className="member-thread-trigger" onClick={() => setSelectedThreadId(letter.thread_id)}>
                <div className="member-letter-meta"><span className="member-avatar-dot">{letter.author_alias?.slice(0, 1).toUpperCase() || "K"}</span><strong>{letter.author_alias || "Kawan Anonim"}</strong><time>{formatRelativeDate(letter.created_at)}</time><Ellipsis size={19} /></div>
                <PaperPreview content={letter.content} templateCode={letter.template_code} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <aside className="member-your-letter-column">
        <div className="member-section-heading"><div><h1>Your Letter</h1></div></div>
        <section className="member-compose-card">
          <div className="member-send-mode" aria-label="Pilihan tujuan surat">
            <button type="button" className={deliveryMode === "public" ? "is-selected" : undefined} aria-pressed={deliveryMode === "public"} onClick={() => { setDeliveryMode("public"); setFeedback(""); }}><Globe2 size={18} /> Kirim Publik</button>
            <button type="button" className={deliveryMode === "special" ? "is-selected" : undefined} aria-pressed={deliveryMode === "special"} onClick={() => { setDeliveryMode("special"); setFeedback(""); }}><Mail size={18} /> Kirim Tujuan Khusus</button>
          </div>
          {deliveryMode === "special" && <label className="field"><span>Tujuan surat privat</span><select value={destination} onChange={(event) => setDestination(event.target.value as "mentor" | "counselor")}><option value="mentor">Mentor / Teman Dengar</option><option value="counselor">Konselor / Psikolog</option></select><small>Surat dikirim ke admin untuk diteruskan dan tidak tampil di Kolam Surat. Paket tujuan harus aktif.</small></label>}
          <div className="member-template-stage">
            <div className={`member-envelope-art envelope-${template.code}`} aria-label={`Preview template ${template.name}`}>
              <div className="member-envelope-flap" />
              <div className="member-envelope-letterhead-preview">
                <div className="member-envelope-letterhead-header">
                  <span>Qonsulin &bull; {template.name}</span>
                  <span>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date())}</span>
                </div>
                <div className="member-envelope-letterhead-body">Tuliskan kata hati dan luapan emosimu di atas kertas ini...</div>
              </div>
              <div className="member-envelope-seal">Q</div>
            </div>
            <div className="member-template-picker" aria-label="Pilih template surat">
              {templates.map((item) => <button key={item.code} type="button" className={selectedTemplate === item.code ? "is-selected" : undefined} disabled={item.tier_required === "premium" && tier !== "premium"} aria-label={item.name} aria-pressed={selectedTemplate === item.code} title={item.tier_required === "premium" && tier !== "premium" ? `${item.name} tersedia untuk Premium` : item.name} onClick={() => setSelectedTemplate(item.code)}><span className={`member-template-thumbnail envelope-${item.code}`}><i /><b>Q</b></span></button>)}
            </div>
          </div>
          <button type="button" className="btn btn-primary member-write-button" onClick={() => { setFeedback(""); setIsComposeOpen(true); }}><PenLine size={18} /> Tulis Surat</button>
          {tier !== "premium" && quota && <p className="member-compose-note">Sisa {quota.remaining} dari {quota.limit} surat pembuka bulan ini.</p>}
          {!isComposeOpen && feedback && <p className="member-compose-feedback" role="status">{feedback}</p>}
          <div className="member-letter-tabs" role="tablist" aria-label="Status surat saya">
            {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : undefined} onClick={() => setActiveTab(tab.id)}>{tab.label}{typeof tab.count === "number" && tab.count > 0 ? <span>{tab.count}</span> : null}</button>)}
          </div>

            <div className="member-own-letter-list">
              {visibleLetters.length === 0 ? <p className="member-empty-state">Belum ada surat pada kategori ini.</p> : visibleLetters.map((letter, index) => <button type="button" key={`${letter.id}-${letter.created_at}-${index}`} className="member-own-letter" onClick={() => setSelectedThreadId(letter.id)}><div className="member-letter-meta"><span className="member-avatar-dot">{activeTab === "inbox" ? (letter.author_alias || "K").slice(0, 1).toUpperCase() : (alias || "T").slice(0, 1).toUpperCase()}</span><strong>{activeTab === "inbox" ? letter.author_alias || "Kawan Cerita" : alias || "Teman Cerita"}</strong><time>{formatRelativeDate(letter.created_at)}</time><Ellipsis size={19} /></div><PaperPreview content={letter.preview} compact /><span className="member-letter-status">{letter.delivery_mode === "special" ? "Privat - " + ({ waiting: "Menunggu penugasan", assigned: "Sudah ditugaskan", in_progress: "Sedang diproses", completed: "Selesai", needs_attention: "Perlu perhatian khusus" }[letter.handling_status || "waiting"]) : letter.moderation_status === "pending" ? "Menunggu moderasi" : letter.moderation_status === "crisis_hold" ? "Ditahan untuk tinjauan" : letter.moderation_status === "rejected" ? "Ditolak" : "Disetujui"}</span></button>)}
            </div>

        </section>
        {orders.some((order) => order.status === "pending") && <p className="member-order-notice">Ada pesanan paket yang menunggu verifikasi transfer.</p>}
        <footer className="member-dashboard-footer"><ShieldCheck size={14} /> Identitasmu tetap menggunakan nama samaran.</footer>
      </aside>
      {selectedThreadId && <ThreadDialog threadId={selectedThreadId} memberId={memberId} tier={tier} onClose={() => setSelectedThreadId(null)} onThreadUpdated={() => { void loadLists(); void onLetterSent(); }} />}
      <CrisisGuidance open={showCrisisGuidance} onClose={() => setShowCrisisGuidance(false)} />
      <dialog ref={composeDialogRef} className="member-compose-dialog" aria-labelledby="member-compose-title" onCancel={(event) => { event.preventDefault(); if (!sending) setIsComposeOpen(false); }}>
          <button type="button" className="member-thread-close" onClick={() => setIsComposeOpen(false)} disabled={sending} aria-label="Tutup form surat"><X size={19} /></button>
          <p className="member-eyebrow">{deliveryMode === "public" ? "KIRIM PUBLIK" : "KIRIM TUJUAN KHUSUS"}</p>
          <h2 id="member-compose-title">Tulis suratmu</h2>
          <p className="member-compose-dialog-copy">{deliveryMode === "public" ? "Surat akan ditinjau moderasi sebelum tampil di Kolam Surat." : "Surat privat untuk " + (destination === "mentor" ? "mentor" : "konselor") + " masuk ke admin terlebih dahulu dan tidak tampil di Kolam Surat."}</p>
          <div className={`member-envelope-art member-compose-envelope envelope-${template.code}`}>
            <div className="member-envelope-flap" />
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tulis suratmu di sini..." aria-label="Isi surat" maxLength={3000} disabled={sending} autoFocus />
            <div className="member-envelope-seal">Q</div>
          </div>
          <div className="member-compose-actions"><span>{draft.length}/3000</span><button type="button" className="btn btn-primary" disabled={sending} onClick={sendOpeningLetter}><Send size={17} /> {sending ? "Mengirim..." : deliveryMode === "public" ? "Kirim Publik" : "Kirim Surat Privat"}</button></div>
          {feedback && <p className="member-compose-feedback" role="status">{feedback}</p>}
      </dialog>
    </div>
  );
}
