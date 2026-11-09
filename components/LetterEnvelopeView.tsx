"use client";

import React, { useState } from "react";
import { Mail, Sparkles, Heart } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ReplyType, replyTypeLabels } from "@/lib/letters";

export type LetterEnvelopeProps = {
  templateCode?: string;
  waxSealColor?: string;
  topic?: string;
  title?: string | null;
  content: string;
  authorAlias?: string;
  authorAvatar?: any;
  dateStr?: string;
  replyType?: ReplyType;
  defaultOpen?: boolean;
  onReplyClick?: () => void;
};

const paperThemeMap: Record<string, { bg: string; color: string; border: string; seal: string; font: string }> = {
  vintage_parchment: {
    bg: "#fbf6ec",
    color: "#451a03",
    border: "#d6c7a7",
    seal: "#991b1b",
    font: "Georgia, 'Times New Roman', serif"
  },
  warm_pastel: {
    bg: "#fdf8f6",
    color: "#292524",
    border: "#fed7aa",
    seal: "#b45309",
    font: "'Nunito', var(--font-body, sans-serif)"
  },
  night_sky: {
    bg: "#0f172a",
    color: "#e2e8f0",
    border: "#334155",
    seal: "#4338ca",
    font: "'Nunito', var(--font-body, sans-serif)"
  },
  botanical_sage: {
    bg: "#f0fdf4",
    color: "#14532d",
    border: "#bbf7d0",
    seal: "#15803d",
    font: "Georgia, serif"
  }
};

export function LetterEnvelopeView({
  templateCode = "vintage_parchment",
  waxSealColor,
  topic = "Luapan Hati",
  title,
  content,
  authorAlias = "Kawan Anonim",
  authorAvatar,
  dateStr,
  replyType = "community",
  defaultOpen = false,
  onReplyClick
}: LetterEnvelopeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const theme = paperThemeMap[templateCode] || paperThemeMap.vintage_parchment;
  const sealColor = waxSealColor || theme.seal;
  const replyInfo = replyTypeLabels[replyType] || replyTypeLabels.community;

  return (
    <div className="envelope-container" style={{ perspective: "1200px", margin: "1.5rem 0" }}>
      {/* Closed Envelope View */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="envelope-closed card"
          style={{
            cursor: "pointer",
            maxWidth: 520,
            margin: "0 auto",
            padding: "2.5rem 2rem",
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "2px solid #e2d9c0",
            borderRadius: "14px",
            boxShadow: "0 14px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
            position: "relative",
            transition: "transform 0.3s ease, box-shadow 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 18px 36px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.08)";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <span className="pill" style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.7)" }}>
              {topic}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>{dateStr || "Baru saja"}</span>
          </div>

          {/* Central Wax Seal Stamp */}
          <div style={{ margin: "1rem auto 1.5rem", width: 72, height: 72, position: "relative" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${sealColor}, #450a0a)`,
                boxShadow: "0 6px 14px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fef08a",
                fontWeight: 900,
                fontSize: "1.5rem",
                fontFamily: "serif",
                border: "2px solid rgba(255,255,255,0.2)"
              }}
            >
              Q
            </div>
            <div style={{ position: "absolute", bottom: -6, right: -6, background: "white", borderRadius: "50%", padding: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <Heart size={14} style={{ color: sealColor, fill: sealColor }} />
            </div>
          </div>

          <h3 style={{ fontSize: "1.15rem", color: "var(--color-ink)", marginBottom: "0.4rem" }}>
            {title || "Surat Batin Dari Teman Anonim"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "1rem" }}>
            Ditulis oleh <strong>{authorAlias}</strong>
          </p>

          <button
            type="button"
            className="btn btn-white"
            style={{ fontSize: "0.85rem", minHeight: 38, padding: "0.4rem 1.1rem" }}
          >
            <Mail size={15} /> Buka & Baca Surat
          </button>
        </div>
      )}

      {/* Unfolded Letter Paper View */}
      {isOpen && (
        <div
          className="letter-paper"
          style={{
            maxWidth: 640,
            margin: "0 auto",
            background: theme.bg,
            color: theme.color,
            border: `2px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "2.5rem 2rem",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
            position: "relative",
            animation: "unfoldPaper 0.5s ease-out"
          }}
        >
          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px dashed ${theme.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <MemberAvatar config={authorAvatar} size={46} />
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{authorAlias}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.75 }}>
                  {topic} &bull; {dateStr || "Baru saja"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  background: "rgba(0,0,0,0.06)",
                  fontWeight: 700
                }}
              >
                {replyInfo.icon} {replyInfo.label}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-white"
                style={{ minHeight: 32, padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                title="Lipat kembali amplop"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Letter Title (if any) */}
          {title && (
            <h2 style={{ fontSize: "1.35rem", marginBottom: "1rem", fontFamily: theme.font }}>
              {title}
            </h2>
          )}

          {/* Letter Body */}
          <div
            style={{
              fontFamily: theme.font,
              fontSize: "1.02rem",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              minHeight: 120,
              padding: "0.5rem 0"
            }}
          >
            {content}
          </div>

          {/* Letter Footer */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.25rem",
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: sealColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fef08a",
                  fontSize: "0.75rem",
                  fontWeight: 900
                }}
              >
                Q
              </div>
              <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>Disegel resmi di Kolam Surat Qonsulin</span>
            </div>

            {onReplyClick && (
              <button
                onClick={onReplyClick}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem", minHeight: 38 }}
              >
                <Mail size={15} /> Balas dengan Surat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}