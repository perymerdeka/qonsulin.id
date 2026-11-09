import React from "react";
import { AvatarConfig, defaultAvatarConfig, avatarBgColors } from "@/lib/member";

type Props = {
  config?: Partial<AvatarConfig> | null;
  size?: number;
  className?: string;
  title?: string;
};

export function MemberAvatar({ config, size = 64, className = "", title = "Avatar Member" }: Props) {
  const merged: AvatarConfig = {
    mood: config?.mood || defaultAvatarConfig.mood,
    glasses: Boolean(config?.glasses),
    bg: config?.bg || defaultAvatarConfig.bg
  };

  const bgSpec = avatarBgColors[merged.bg] || avatarBgColors.sky;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bgSpec.bg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "2px solid rgba(255,255,255,0.8)",
        overflow: "hidden",
        flexShrink: 0
      }}
      title={title}
    >
      <svg width={size * 0.88} height={size * 0.88} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Face Base */}
        <circle cx="50" cy="50" r="40" fill="#fed7aa" />

        {/* Cheeks */}
        {(merged.mood === "smile" || merged.mood === "thoughtful" || merged.mood === "relieved") && (
          <>
            <circle cx="30" cy="54" r="5" fill="#fda4af" opacity="0.65" />
            <circle cx="70" cy="54" r="5" fill="#fda4af" opacity="0.65" />
          </>
        )}

        {/* Eyes according to mood */}
        {merged.mood === "relieved" ? (
          <>
            {/* Happy closed eyes (curves) */}
            <path d="M 33 46 Q 38 41 43 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
            <path d="M 57 46 Q 62 41 67 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : merged.mood === "calm" ? (
          <>
            <ellipse cx="38" cy="46" rx="3.5" ry="4" fill="#451a03" />
            <ellipse cx="62" cy="46" rx="3.5" ry="4" fill="#451a03" />
          </>
        ) : (
          <>
            <ellipse cx="38" cy="46" rx="4" ry="5" fill="#451a03" />
            <ellipse cx="62" cy="46" rx="4" ry="5" fill="#451a03" />
            {/* Sparkle highlight */}
            <circle cx="40" cy="44" r="1.5" fill="#fff" />
            <circle cx="64" cy="44" r="1.5" fill="#fff" />
          </>
        )}

        {/* Mouth */}
        {merged.mood === "smile" && (
          <path d="M 40 60 Q 50 71 60 60" stroke="#451a03" strokeWidth="3.2" strokeLinecap="round" />
        )}
        {merged.mood === "calm" && (
          <path d="M 42 63 L 58 63" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
        )}
        {merged.mood === "relieved" && (
          <path d="M 40 59 Q 50 67 60 59" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
        )}
        {merged.mood === "thoughtful" && (
          <path d="M 45 61 Q 50 64 56 61" stroke="#451a03" strokeWidth="2.8" strokeLinecap="round" />
        )}

        {/* Glasses Accessory */}
        {merged.glasses && (
          <g>
            <circle cx="38" cy="46" r="11" stroke="#0f766e" strokeWidth="2.6" fill="rgba(255,255,255,0.25)" />
            <circle cx="62" cy="46" r="11" stroke="#0f766e" strokeWidth="2.6" fill="rgba(255,255,255,0.25)" />
            <line x1="49" y1="46" x2="51" y2="46" stroke="#0f766e" strokeWidth="2.6" />
          </g>
        )}
      </svg>
    </div>
  );
}
