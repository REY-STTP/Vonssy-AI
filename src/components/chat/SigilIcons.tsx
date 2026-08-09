"use client";

/**
 * Custom SVG sigil icons for each AI gateway.
 * Per spec Section 2: "distinct angular glyphs (not borrowed brand logos)"
 * tied to the demon-king/seal mythology.
 *
 * xKiro: Hexagonal geometric glyph
 * NaraRouter: Diamond-lattice pattern
 * Inception: Starburst/radial pattern
 */

interface SigilProps {
  className?: string;
  size?: number;
}

/** SeekAi — Circular eye/lens motif: concentric rings with a crosshair */
export function SeekAiSigil({ className = "", size = 24 }: SigilProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="5" />
      {/* Core dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      {/* Crosshair lines */}
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/** xKiro — Hexagonal seal with inner angular lines */
export function XKiroSigil({ className = "", size = 24 }: SigilProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      {/* Outer hexagon */}
      <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
      {/* Inner cross pattern */}
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="7" x2="22" y2="17" />
      <line x1="22" y1="7" x2="2" y2="17" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** NaraRouter — Diamond lattice with interconnected nodes */
export function NaraSigil({ className = "", size = 24 }: SigilProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      {/* Outer diamond */}
      <polygon points="12,1 23,12 12,23 1,12" />
      {/* Inner diamond */}
      <polygon points="12,6 18,12 12,18 6,12" />
      {/* Connecting lines (lattice) */}
      <line x1="12" y1="1" x2="12" y2="6" />
      <line x1="23" y1="12" x2="18" y2="12" />
      <line x1="12" y1="23" x2="12" y2="18" />
      <line x1="1" y1="12" x2="6" y2="12" />
      {/* Corner nodes */}
      <circle cx="12" cy="1" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="23" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="23" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="1" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Inception — Starburst radial pattern with pointed rays */
export function InceptionSigil({ className = "", size = 24 }: SigilProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10" />
      {/* 8-point starburst rays */}
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="8.46" y2="8.46" />
      <line x1="15.54" y1="15.54" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="8.46" y2="15.54" />
      <line x1="15.54" y1="8.46" x2="19.07" y2="4.93" />
      {/* Center filled circle */}
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Map sigil IDs to components */
export const SIGIL_COMPONENTS = {
  seekai: SeekAiSigil,
  xkiro: XKiroSigil,
  nara: NaraSigil,
  inception: InceptionSigil,
} as const;

export type SigilId = keyof typeof SIGIL_COMPONENTS;
