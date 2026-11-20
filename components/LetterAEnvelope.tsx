"use client";

import { useEffect, useState } from "react";

type LetterAEnvelopeProps = {
  closed?: boolean;
  opening?: boolean;
  compact?: boolean;
  content?: string;
  variant?: "burgundy" | "golden" | "emerald";
  onOpeningComplete?: () => void;
};

const artwork = {
  burgundy: {
    closed: "/member/letter-a/letter-a-stage-closed.png",
    reference: "/member/letter-a/letter-a-stage-open.png",
    frames: [
      "/member/letter-a/letter-a-stage-closed.png",
      "/member/letter-a/letter-a-stage-open.png",
      "/member/letter-a/letter-a-stage-rising.png",
      "/member/letter-a/letter-a-stage-full.png"
    ]
  },
  golden: {
    closed: "/member/letter-b/letter-b-stage-closed.png",
    reference: "/member/letter-b/letter-b-stage-open.png",
    frames: [
      "/member/letter-b/letter-b-stage-closed.png",
      "/member/letter-b/letter-b-stage-open.png",
      "/member/letter-b/letter-b-stage-rising.png",
      "/member/letter-b/letter-b-stage-full.png"
    ]
  },
  emerald: {
    closed: "/member/letter-c/letter-c-stage-closed.png",
    reference: "/member/letter-c/letter-c-stage-open.png",
    frames: [
      "/member/letter-c/letter-c-stage-closed.png",
      "/member/letter-c/letter-c-stage-open.png",
      "/member/letter-c/letter-c-stage-rising.png",
      "/member/letter-c/letter-c-stage-full.png"
    ]
  }
} as const;

export function LetterAEnvelope({ closed = false, opening = false, compact = false, content, variant = "burgundy", onOpeningComplete }: LetterAEnvelopeProps) {
  const [step, setStep] = useState(0);
  const selectedArtwork = artwork[variant];

  useEffect(() => {
    if (!opening) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reduceMotion ? 25 : 810;
    const timers = [
      window.setTimeout(() => setStep(1), interval),
      window.setTimeout(() => setStep(2), interval * 2),
      window.setTimeout(() => setStep(3), interval * 3),
      window.setTimeout(() => onOpeningComplete?.(), reduceMotion ? 100 : 3500)
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [opening, onOpeningComplete]);

  if (opening) {
    return (
      <div className={`letter-a-envelope is-opening is-${variant}`} data-step={step} aria-hidden="true">
        <div className="letter-a-motion-scene">
          {selectedArtwork.frames.map((src, index) => (
            <img
              key={src}
              className={`letter-a-motion-frame letter-a-motion-frame-${index}${step === index ? " is-current" : ""}`}
              src={src}
              width={540}
              height={index === 0 ? 361 : index === 3 ? 700 : 599}
              alt=""
            />
          ))}
          <div className="letter-a-motion-copy">
            <p>Untukmu,</p>
            <div>{content}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`letter-a-envelope is-${variant}${closed ? " is-closed" : ""}${compact ? " is-compact" : ""}`} aria-hidden="true">
      <img
        className="letter-a-envelope-reference"
        src={closed ? selectedArtwork.closed : selectedArtwork.reference}
        width={540}
        height={closed ? 360 : 599}
        alt=""
      />
    </div>
  );
}
