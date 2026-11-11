"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header, Footer } from "@/components/PublicChrome";
import { getThreadDetail, LetterThreadDetail, replyTypeLabels } from "@/lib/letters";
import { LetterEnvelopeView } from "@/components/LetterEnvelopeView";
import { ArrowLeft, Mail, HeartHandshake, Heart, ShieldCheck, MessageCircle } from "lucide-react";
import { LetterThreadActions } from "@/components/LetterThreadActions";
import { getCurrentMemberProfile } from "@/lib/member-auth";

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const threadId = resolvedParams.id;

  const [thread, setThread] = useState<LetterThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getThreadDetail(threadId);
        if (!active) return;
        setThread(data);
        if (data) {
          const profile = await getCurrentMemberProfile();
          if (!active) return;
          const author = data.opening_letter.sender_id === profile?.id;
          const isReplier = data.replies.some((reply) => reply.sender_id === profile?.id);
          setIsAuthor(Boolean(profile && author));
          setIsParticipant(Boolean(profile && (author || isReplier)));
        }
      } catch (e) {
        console.warn("Failed to load thread detail:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [threadId]);

  if (loading) {
    return (
      <main className="site-shell">
        <Header active="/member" />
        <section className="section container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <p style={{ color: "var(--color-muted)" }}>Membuka lembaran surat...</p>
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
              Surat ini mungkin sedang dalam kurasi moderasi atau telah diarsipkan.
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

  return (
    <main className="site-shell">
      <Header active="/member" />
      <section className="section container" style={{ maxWidth: 840, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {/* Navigation */}
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <Link href="/surat/pool" style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", color: "var(--color-brand-strong)", fontSize: "0.88rem", fontWeight: 700 }}>
            <ArrowLeft size={16} /> Kembali ke Kolam Surat
          </Link>
          <span className="pill muted" style={{ fontSize: "0.78rem" }}>
            Topik: {thread.topic}
          </span>
          {thread.status !== "open" && (
            <span
              className="pill"
              style={{
                fontSize: "0.75rem",
                background: thread.status === "blocked" ? "#fee2e2" : "#fef3c7",
                color: thread.status === "blocked" ? "#991b1b" : "#92400e",
                display: "inline-flex", gap: "0.3rem", alignItems: "center"
              }}
            >
              <ShieldCheck size={13} />
              {thread.status === "closed"
                ? "Percakapan Ditutup"
                : thread.status === "blocked"
                  ? "Thread Diblokir"
                  : "Menunggu Tinjauan Moderator"}
            </span>
          )}
        </div>

        {/* Opening Letter (Always unfolded) */}
        <div style={{ marginBottom: "2rem" }}>
          <LetterEnvelopeView
            templateCode={thread.opening_letter.template_code}
            topic={thread.topic}
            title={thread.opening_letter.title}
            content={thread.opening_letter.content}
            authorAlias={thread.opening_letter.author_alias}
            authorAvatar={thread.opening_letter.author_avatar}
            dateStr={new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(thread.opening_letter.created_at))}
            replyType={thread.opening_letter.reply_type}
            defaultOpen={true}
          />
        </div>

        {/* Replies Section */}
        <div style={{ maxWidth: 640, margin: "2.5rem auto 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-rule)", paddingBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", color: "var(--color-ink)", margin: 0, display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <HeartHandshake size={18} style={{ color: "var(--color-brand)" }} /> Balasan Kawan Cerita ({thread.replies.length})
            </h3>
            {thread.status === "open" && !isAuthor && (
              <Link href={`/surat/${thread.id}/balas`} className="btn btn-primary" style={{ fontSize: "0.82rem", minHeight: 34, padding: "0.3rem 0.9rem" }}>
                <Mail size={14} /> Balas Surat Ini
              </Link>
            )}
            <LetterThreadActions
              threadId={thread.id}
              threadStatus={thread.status}
              asParticipant={isParticipant}
              onActionComplete={(action) => {
                if (action === "block") router.refresh();
                if (action === "close") router.refresh();
                if (action === "report") {
                  setIsParticipant(false);
                }
              }}
            />
          </div>

          {thread.replies.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--color-surface-muted)" }}>
              <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", marginBottom: isAuthor ? 0 : "1rem" }}>
                {isAuthor
                  ? "Belum ada balasan. Suratmu sedang menunggu kawan cerita yang tergerak membalas."
                  : "Belum ada balasan untuk surat ini. Berikan kata-kata penguat pertama untuknya."}
              </p>
              {!isAuthor && (
                <Link href={`/surat/${thread.id}/balas`} className="btn btn-soft" style={{ fontSize: "0.85rem" }}>
                  <Heart size={15} /> Tulis Balasan Pertama
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {thread.replies.map((reply) => {
                const repInfo = replyTypeLabels[reply.reply_type] || replyTypeLabels.community;
                return (
                  <div key={reply.id} style={{ transform: "none" }}>
                    <LetterEnvelopeView
                      templateCode={reply.template_code}
                      topic={thread.topic}
                      title={null}
                      content={reply.content}
                      authorAlias={reply.author_alias}
                      authorAvatar={reply.author_avatar}
                      dateStr={new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(reply.created_at))}
                      replyType={reply.reply_type}
                      defaultOpen={true}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer */}
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            {thread.status === "open" && !isAuthor && (
              <Link href={`/surat/${thread.id}/balas`} className="btn btn-primary" style={{ display: "inline-flex", gap: "0.4rem", minWidth: 200, justifyContent: "center" }}>
                <Mail size={16} /> Balas Surat Ini
              </Link>
            )}
            {thread.status === "closed" && (
              <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Percakapan ini telah ditutup dan tidak menerima balasan baru.
              </div>
            )}
            {thread.status === "blocked" && (
              <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Thread ini telah diblokir dan disembunyikan.
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}