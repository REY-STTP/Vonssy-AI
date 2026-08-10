"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import {
  croodlesNeutral,
  loreleiNeutral,
  notionistsNeutral,
} from "@dicebear/collection";
import type { Style } from "@dicebear/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLE_MAP: Record<string, Style<any>> = {
  "croodles-neutral": croodlesNeutral,
  "lorelei-neutral": loreleiNeutral,
  "notionists-neutral": notionistsNeutral,
};

interface UserAvatarProps {
  user: {
    name?: string | null;
    image?: string | null;
    avatarSource?: string | null;
    avatarStyle?: string | null;
    avatarSeed?: string | null;
  };
  size?: number;
  className?: string;
}

/**
 * Shared avatar component used across the app.
 * Renders DiceBear generated SVG or OAuth profile photo.
 */
export default function UserAvatar({ user, size = 32, className = "" }: UserAvatarProps) {
  const dicebearUri = useMemo(() => {
    if (
      user.avatarSource !== "generated" ||
      !user.avatarStyle ||
      !user.avatarSeed ||
      !STYLE_MAP[user.avatarStyle]
    ) {
      return null;
    }

    const avatar = createAvatar(STYLE_MAP[user.avatarStyle], {
      seed: user.avatarSeed,
      size,
      backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
    });
    return avatar.toDataUri();
  }, [user.avatarSource, user.avatarStyle, user.avatarSeed, size]);

  const sizeClass = `w-[${size}px] h-[${size}px]`;
  const baseClass = `rounded-full border border-border shrink-0 ${className}`;

  // Generated avatar
  if (dicebearUri) {
    return (
      <img
        src={dicebearUri}
        alt=""
        className={`${baseClass} bg-surface-raised`}
        style={{ width: size, height: size }}
      />
    );
  }

  // OAuth profile photo
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className={baseClass}
        style={{ width: size, height: size }}
      />
    );
  }

  // Initials fallback
  return (
    <div
      className={`${baseClass} bg-surface-raised flex items-center justify-center font-semibold text-text-secondary`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.35)),
      }}
    >
      {user.name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

/**
 * Generate a DiceBear avatar data URI for preview purposes.
 * Used by the avatar picker popover.
 */
export function generateAvatarUri(style: string, seed: string, size = 72): string | null {
  const styleDef = STYLE_MAP[style];
  if (!styleDef) return null;

  const avatar = createAvatar(styleDef, { 
    seed, 
    size,
    backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
  });
  return avatar.toDataUri();
}
