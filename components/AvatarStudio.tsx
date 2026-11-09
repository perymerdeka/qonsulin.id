"use client";

import React from "react";
import { AvatarConfig, AvatarMood, AvatarBg, avatarBgColors, avatarMoodOptions } from "@/lib/member";
import { MemberAvatar } from "@/components/MemberAvatar";

type Props = {
  value: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  alias?: string;
};

export function AvatarStudio({ value, onChange, alias }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
      <div style={{ textAlign: "center", padding: "1.25rem", background: "var(--color-surface-muted)", borderRadius: "var(--radius-lg, 12px)", border: "1px solid var(--color-rule)" }}>
        <MemberAvatar config={value} size={110} />
        <div style={{ marginTop: "0.75rem", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-ink)" }}>
          {alias || "Teman Cerita"}
        </div>
        <small style={{ color: "var(--color-muted)", fontSize: "0.8rem", display: "block", marginTop: "2px" }}>
          Avatar ini yang tampil di Kolam Surat (identitas asli terlindungi)
        </small>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink)", display: "block", marginBottom: "0.4rem" }}>
            Ekspresi Suasana Hati
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {avatarMoodOptions.map((opt) => {
              const active = value.mood === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => onChange({ ...value, mood: opt.id })}
                  className={active ? "btn btn-primary" : "btn btn-white"}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink)", display: "block", marginBottom: "0.4rem" }}>
            Aksesoris Wajah
          </label>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              onClick={() => onChange({ ...value, glasses: false })}
              className={!value.glasses ? "btn btn-primary" : "btn btn-white"}
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
            >
              Tanpa Kacamata
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, glasses: true })}
              className={value.glasses ? "btn btn-primary" : "btn btn-white"}
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
            >
              Kacamata Bulat
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-ink)", display: "block", marginBottom: "0.4rem" }}>
            Warna Latar Belakang
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {(Object.keys(avatarBgColors) as AvatarBg[]).map((bgKey) => {
              const active = value.bg === bgKey;
              return (
                <button
                  type="button"
                  key={bgKey}
                  onClick={() => onChange({ ...value, bg: bgKey })}
                  className={active ? "btn btn-primary" : "btn btn-white"}
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: avatarBgColors[bgKey].bg, border: "1px solid rgba(0,0,0,0.2)" }} />
                  {avatarBgColors[bgKey].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

