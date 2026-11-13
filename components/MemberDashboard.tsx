"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Ellipsis, Globe2, Mail, MessageCircle, PenLine, Send, ShieldCheck, X } from "lucide-react";
import { defaultTemplates, getActiveTemplates, getMemberLetterThreads, getPoolLetters, getThreadDetail, type LetterItem, type LetterQuota, type LetterTemplate, type LetterThreadDetail, type MemberThreadSummary } from "@/lib/letters";
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

function PaperPreview({ content, templateCode, compact = false, full = false }: { content: string; templateCode?: string; compact?: boolean; full?: boolean }) {
  const limit = compact ? 150 : 220;
  return <div className={`member-paper-preview paper-${templateCode || "vintage_parchment"}${compact ? " is-compact" : ""}${full ? " is-full" : ""}`}>{!full && content.length > limit ? `${content.slice(0, limit)}...` : content}</div>;
}

function ThreadDialog({ threadId, memberId, onClose }: { threadId: string; memberId: string; onClose: () => void }) {
  const [thread, setThread] = useState<LetterThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  const isAuthor = thread?.opening_letter.sender_id === memberId;
  return (
    <div className="member-thread-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="member-thread-dialog" role="dialog" aria-modal="true" aria-label="Thread surat">
        <button type="button" className="member-thread-close" onClick={onClose} aria-label="Tutup thread"><X size={19} /></button>
        {loading ? <p className="member-empty-state">Membuka thread surat...</p> : !thread ? <p className="member-empty-state">Thread surat tidak dapat dibuka.</p> : (
          <>
            <div className="member-thread-heading"><p className="member-eyebrow">THREAD SURAT</p><h2>{thread.topic}</h2></div>
            <article className="member-thread-item">
              <div className="member-letter-meta"><span className="member-avatar-dot">{thread.opening_letter.author_alias?.slice(0, 1).toUpperCase() || "K"}</span><strong>{thread.opening_letter.author_alias || "Kawan Anonim"}</strong><time>{formatRelativeDate(thread.opening_letter.created_at)}</time></div>
              <PaperPreview content={thread.opening_letter.content} templateCode={thread.opening_letter.template_code} full />
            </article>
            <div className="member-thread-replies"><h3><MessageCircle size={17} /> Balasan ({thread.replies.length})</h3>
              {thread.replies.length === 0 ? <p>Belum ada balasan untuk surat ini.</p> : thread.replies.map((reply) => <article key={reply.id} className="member-thread-item"><div className="member-letter-meta"><span className="member-avatar-dot">{reply.author_alias?.slice(0, 1).toUpperCase() || "K"}</span><strong>{reply.author_alias || "Kawan Cerita"}</strong><time>{formatRelativeDate(reply.created_at)}</time></div><PaperPreview content={reply.content} templateCode={reply.template_code} full /></article>)}
            </div>
            {thread.status === "open" && thread.delivery_mode === "public" && !isAuthor && <Link href={`/surat/${thread.id}/balas`} className="btn btn-primary member-thread-reply"><MessageCircle size={16} /> Balas Surat Ini</Link>}
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
              <div className="member-envelope-letter">Pilih template suratmu</div>
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
      {selectedThreadId && <ThreadDialog threadId={selectedThreadId} memberId={memberId} onClose={() => setSelectedThreadId(null)} />}
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
