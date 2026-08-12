"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useReadingFont, type ReadingFont } from "@/hooks/useReadingFont";
import { useLocale, type Locale } from "@/hooks/useLocale";
import UserAvatar, { generateAvatarUri } from "@/components/UserAvatar";

/* ── Types ─────────────────────────────────────────────────── */

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    provider?: string | null;
    createdAt?: string | null;
    preferredName?: string | null;
    dateOfBirth?: string | null;
    avatarSource?: string | null;
    avatarStyle?: string | null;
    avatarSeed?: string | null;
  };
  quota?: { remaining: number; limit: number } | null;
}

type SubMenu = "profile" | "appearance" | "data";

/* ── Sub-menu nav items ────────────────────────────────────── */

const NAV_ICONS: Record<SubMenu, React.ReactNode> = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  appearance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  data: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

/* ── Provider Icons (small 12px marks) ─────────────────────── */

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    );
  }
  if (provider === "github") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    );
  }
  return null;
}

/* ── Main Component ────────────────────────────────────────── */

export default function SettingsModal({ isOpen, onClose, user, quota }: SettingsModalProps) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<SubMenu>("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Preferred name editing state
  const [nickValue, setNickValue] = useState(user.preferredName ?? "");
  const [nickPersisted, setNickPersisted] = useState(user.preferredName ?? "");
  const [nickStatus, setNickStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nickError, setNickError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Date of birth editing state
  const [dobValue, setDobValue] = useState(user.dateOfBirth ?? "");
  const [dobPersisted, setDobPersisted] = useState(user.dateOfBirth ?? "");
  const [dobStatus, setDobStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dobError, setDobError] = useState<string | null>(null);
  const dobTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  const { theme, setTheme } = useTheme();
  const { readingFont, setReadingFont, mounted: fontMounted } = useReadingFont();
  const { locale, setLocale, t } = useLocale();
  const [mounted, setMounted] = useState(false);

  // Avatar picker state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarPickerSource, setAvatarPickerSource] = useState<"oauth" | "generated">(user.avatarSource as "oauth" | "generated" ?? "oauth");
  const [avatarPickerStyle, setAvatarPickerStyle] = useState(user.avatarStyle || "croodles-neutral");
  const [avatarPickerSeed, setAvatarPickerSeed] = useState(user.avatarSeed || Math.random().toString(36).substring(2, 10));
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarPickerRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS: { id: SubMenu; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: t("settings.profile"), icon: NAV_ICONS.profile },
    { id: "appearance", label: t("settings.appearance"), icon: NAV_ICONS.appearance },
    { id: "data", label: t("settings.dataUsage"), icon: NAV_ICONS.data },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Store previous focus and trap focus in modal
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Small delay so the modal DOM is ready
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showDeleteConfirm]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setNickStatus("idle");
      setNickError(null);
      setDobStatus("idle");
      setDobError(null);
    }
  }, [isOpen]);

  // Sync nickValue when user prop changes (e.g. after page refresh)
  useEffect(() => {
    setNickValue(user.preferredName ?? "");
    setNickPersisted(user.preferredName ?? "");
  }, [user.preferredName]);

  // Sync dobValue when user prop changes
  useEffect(() => {
    setDobValue(user.dateOfBirth ?? "");
    setDobPersisted(user.dateOfBirth ?? "");
  }, [user.dateOfBirth]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vonssy-ai-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      }
    } catch (err) {
      console.error("Delete error:", err);
      setIsDeleting(false);
    }
  }, []);

  const selectMenu = useCallback((menu: SubMenu) => {
    setActiveMenu(menu);
  }, []);

  // Save preferred name on blur / Enter
  const savePreferredName = useCallback(async () => {
    const trimmed = nickValue.trim();
    // If nothing changed from last persisted value, skip
    if (trimmed === nickPersisted.trim()) return;

    setNickStatus("saving");
    setNickError(null);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    try {
      const res = await fetch("/api/user/preferred-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredName: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      const data = await res.json();
      const saved = data.preferredName ?? "";
      setNickValue(saved);
      setNickPersisted(saved);
      setNickStatus("saved");
      router.refresh();
      savedTimerRef.current = setTimeout(() => setNickStatus("idle"), 1500);
    } catch (err) {
      // Revert to last known-good value
      setNickValue(nickPersisted);
      setNickStatus("error");
      setNickError(err instanceof Error ? err.message : "Couldn't save — try again.");
    }
  }, [nickValue, nickPersisted]);

  const handleNickKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    },
    []
  );

  // Save date of birth on blur
  const saveDateOfBirth = useCallback(async () => {
    if (dobValue === dobPersisted) return;

    setDobStatus("saving");
    setDobError(null);
    if (dobTimerRef.current) clearTimeout(dobTimerRef.current);

    try {
      const res = await fetch("/api/user/date-of-birth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth: dobValue || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      const data = await res.json();
      const saved = data.dateOfBirth ?? "";
      setDobValue(saved);
      setDobPersisted(saved);
      setDobStatus("saved");
      router.refresh();
      dobTimerRef.current = setTimeout(() => setDobStatus("idle"), 1500);
    } catch (err) {
      setDobValue(dobPersisted);
      setDobStatus("error");
      setDobError(err instanceof Error ? err.message : "Couldn't save — try again.");
    }
  }, [dobValue, dobPersisted]);

  if (!isOpen) return null;

  const used = quota ? quota.limit - quota.remaining : 0;
  const limit = quota?.limit ?? 25;
  const remaining = quota?.remaining ?? 25;
  const progressPct = limit > 0 ? Math.max(0, ((limit - remaining) / limit) * 100) : 0;

  /* ── Profile Sub-menu ────────────────────────────────────── */
  const profileContent = (
    <div className="space-y-4">
      {/* Identity block */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar user={user} size={48} />
          <button
            type="button"
            onClick={() => {
              setAvatarPickerSource(user.avatarSource as "oauth" | "generated" ?? "oauth");
              setAvatarPickerStyle(user.avatarStyle || "croodles-neutral");
              setAvatarPickerSeed(user.avatarSeed || Math.random().toString(36).substring(2, 10));
              setShowAvatarPicker(!showAvatarPicker);
            }}
            className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            title={t("avatar.changeAvatar")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {/* Avatar Picker Popover */}
          {showAvatarPicker && (
            <div
              ref={avatarPickerRef}
              className="absolute top-14 left-0 z-50 bg-surface border border-border rounded-xl shadow-lg p-4 w-[280px] space-y-4 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview */}
              <div className="flex justify-center">
                {avatarPickerSource === "generated" ? (
                  <img
                    src={generateAvatarUri(avatarPickerStyle, avatarPickerSeed, 72) || ""}
                    alt=""
                    className="w-[72px] h-[72px] rounded-full border border-border bg-surface-raised"
                  />
                ) : (
                  <UserAvatar user={{ ...user, avatarSource: "oauth" }} size={72} />
                )}
              </div>

              {/* Option 1: Use profile photo */}
              <button
                type="button"
                onClick={() => setAvatarPickerSource("oauth")}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-[13px] font-medium ${
                  avatarPickerSource === "oauth"
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                }`}
              >
                {user.image ? (
                  <img src={user.image} alt="" className="w-7 h-7 rounded-full border border-border shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-border bg-surface-raised flex items-center justify-center text-[10px] font-semibold text-text-secondary shrink-0">
                    {user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                {t("avatar.useProfilePhoto")}
              </button>

              {/* Option 2: Generated avatar */}
              <div className={`space-y-3 transition-opacity ${avatarPickerSource === "oauth" ? "opacity-40" : ""}`}>
                <div className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">{t("avatar.generatedAvatar")}</div>

                {/* Style selector — segmented control */}
                <div className="flex gap-1 bg-surface-raised rounded-lg p-0.5">
                  {([
                    { value: "croodles-neutral", label: t("avatar.styleCroodles") },
                    { value: "lorelei-neutral", label: t("avatar.styleLorelei") },
                    { value: "notionists-neutral", label: t("avatar.styleNotionists") },
                  ] as const).map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setAvatarPickerSource("generated");
                        setAvatarPickerStyle(s.value);
                      }}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                        avatarPickerStyle === s.value && avatarPickerSource === "generated"
                          ? "bg-surface text-text-primary shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Shuffle button */}
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPickerSource("generated");
                    setAvatarPickerSeed(Math.random().toString(36).substring(2, 10));
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded-lg border border-border transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" />
                    <circle cx="6" cy="6" r="1" /><circle cx="18" cy="18" r="1" />
                  </svg>
                  {t("avatar.shuffle")}
                </button>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="flex-1 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary rounded-lg border border-border hover:bg-surface-raised transition-colors"
                >
                  {t("avatar.cancel")}
                </button>
                <button
                  type="button"
                  disabled={isSavingAvatar}
                  onClick={async () => {
                    setIsSavingAvatar(true);
                    try {
                      const payload = avatarPickerSource === "oauth"
                        ? { source: "oauth" }
                        : { source: "generated", style: avatarPickerStyle, seed: avatarPickerSeed };
                      const res = await fetch("/api/user/avatar", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      if (res.ok) {
                        router.refresh();
                        setShowAvatarPicker(false);
                      }
                    } finally {
                      setIsSavingAvatar(false);
                    }
                  }}
                  className="flex-1 py-1.5 text-[13px] font-medium bg-accent text-accent-contrast rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSavingAvatar ? "..." : t("avatar.save")}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="text-base font-semibold text-text-primary truncate">{user.name || "User"}</div>
      </div>

      <div className="border-t border-border" />

      {/* Name */}
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-text-secondary">{t("profile.name")}</span>
        <span className="text-text-primary font-medium truncate ml-4">{user.name || "—"}</span>
      </div>

      <div className="border-t border-border" />

      {/* Preferred name (editable) */}
      <div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-secondary">{t("profile.preferredName")}</span>
          <div className="flex items-center gap-2">
            {nickStatus === "saving" && (
              <svg className="animate-spin text-text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {nickStatus === "saved" && (
              <svg className="text-accent animate-fade-in" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <input
              type="text"
              value={nickValue}
              onChange={(e) => {
                setNickValue(e.target.value);
                if (nickStatus === "error") {
                  setNickStatus("idle");
                  setNickError(null);
                }
              }}
              onBlur={savePreferredName}
              onKeyDown={handleNickKeyDown}
              placeholder={user.name || t("profile.preferredNamePlaceholder")}
              maxLength={12}
              className="bg-surface-raised border border-border rounded-lg text-[13px] font-medium text-text-primary placeholder:text-text-secondary py-1.5 px-2.5 text-right min-w-[150px] max-w-[150px] w-auto focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        </div>
        {nickStatus === "error" && nickError && (
          <p className="text-[13px] text-danger mt-1.5 text-right">{nickError}</p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Date of birth */}
      <div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-secondary">{t("profile.dateOfBirth")}</span>
          <div className="flex items-center gap-2">
            {dobStatus === "saving" && (
              <svg className="animate-spin text-text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {dobStatus === "saved" && (
              <svg className="text-accent animate-fade-in" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <div className="relative flex items-center min-w-[150px] max-w-[150px]">
              <input
                ref={dobInputRef}
                type="date"
                title={t("profile.datePicker") || "Show date picker"}
                value={dobValue}
                onChange={(e) => {
                  setDobValue(e.target.value);
                  if (dobStatus === "error") {
                    setDobStatus("idle");
                    setDobError(null);
                  }
                }}
                onBlur={saveDateOfBirth}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                max={new Date().toISOString().split("T")[0]}
                min="1900-01-01"
                className="bg-surface-raised border border-border rounded-lg text-[13px] font-medium text-text-primary py-1.5 pl-2.5 pr-8 text-right w-full focus:border-accent focus:outline-none transition-colors appearance-none [&::-webkit-date-and-time-value]:text-right [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <button 
                type="button"
                onClick={() => {
                  const input = dobInputRef.current;
                  if (input) {
                    if (typeof input.showPicker === 'function') {
                      try {
                        input.showPicker();
                      } catch (e) {
                        input.focus();
                      }
                    } else {
                      input.focus();
                    }
                  }
                }}
                title={t("profile.datePicker") || "Show date picker"}
                className="absolute right-1 p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {dobStatus === "error" && dobError && (
          <p className="text-[13px] text-danger mt-1.5 text-right">{dobError}</p>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Email */}
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-text-secondary">{t("profile.email")}</span>
        <span className="text-text-primary font-medium truncate ml-4">{user.email || "—"}</span>
      </div>

      <div className="border-t border-border" />

      {/* Provider */}
      {user.provider && (
        <>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-text-secondary">{t("profile.signedInWith")}</span>
            <div className="flex items-center gap-1.5 text-text-primary font-medium">
              <ProviderIcon provider={user.provider} />
              <span>{user.provider.charAt(0).toUpperCase() + user.provider.slice(1)}</span>
            </div>
          </div>
          <div className="border-t border-border" />
        </>
      )}

      {/* Member since */}
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-text-secondary">{t("profile.memberSince")}</span>
        <span className="text-text-primary font-medium">
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "long", day: "numeric", year: "numeric" })
            : "Unknown"}
        </span>
      </div>

      <div className="border-t border-border" />

      {/* Sign out */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="btn-secondary w-full justify-center gap-2 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {t("profile.signOut")}
      </button>
    </div>
  );

  /* ── Appearance Sub-menu ─────────────────────────────────── */
  const currentTheme = mounted ? theme : "system";

  const themeOptions = [
    {
      id: "light" as const,
      label: "Light",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      id: "dark" as const,
      label: "Dark",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
    {
      id: "system" as const,
      label: "System",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  const activeThemeIndex = themeOptions.findIndex((t) => t.id === currentTheme);

  const appearanceContent = (
    <div className="space-y-4">
      <div className="text-[13px] font-semibold text-text-primary">{t("appearance.theme")}</div>

      {/* Theme Segmented Control */}
      <div className="relative flex bg-surface-raised rounded-[10px] p-1">
        {mounted && (
          <div
            className="absolute top-1 bottom-1 rounded-[8px] bg-surface border border-border shadow-soft transition-all duration-150 ease-out"
            style={{
              width: `calc(${100 / 3}% - 2px)`,
              left: `calc(${(activeThemeIndex * 100) / 3}% + 1px)`,
            }}
          />
        )}

        {themeOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTheme === opt.id ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-text-secondary">
        {t("appearance.themeHelper")}
      </p>

      {/* ── Message Font (Dropdown) ──────────────── */}
      <div className="border-t border-border" />

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text-primary">{t("appearance.messageFont")}</div>
        <select
          value={readingFont}
          onChange={(e) => setReadingFont(e.target.value as ReadingFont)}
          className="bg-surface-raised border border-border rounded-lg text-[13px] font-medium text-text-primary py-1.5 px-2.5 pr-8 focus:border-accent focus:outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239C978E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%224%206%208%2010%2012%206%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_6px_center] bg-no-repeat"
        >
          <option value="default">{t("appearance.fontDefault")}</option>
          <option value="serif">{t("appearance.fontSerif")}</option>
          <option value="mono">{t("appearance.fontMono")}</option>
        </select>
      </div>

      <p className="text-[12px] text-text-secondary">
        {t("appearance.fontHelper")}
      </p>

      {/* ── Language (Dropdown) ──────────────────── */}
      <div className="border-t border-border" />

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-text-primary">{t("appearance.language")}</div>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="bg-surface-raised border border-border rounded-lg text-[13px] font-medium text-text-primary py-1.5 px-2.5 pr-8 focus:border-accent focus:outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239C978E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%224%206%208%2010%2012%206%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_6px_center] bg-no-repeat"
        >
          <option value="en">{t("appearance.langEn")}</option>
          <option value="id">{t("appearance.langId")}</option>
        </select>
      </div>
    </div>
  );

  /* ── Data & Usage Sub-menu ───────────────────────────────── */
  const dataContent = (
    <div className="space-y-4">
      {/* Usage today */}
      <div className="text-[13px] font-semibold text-text-primary">{t("data.usageToday")}</div>

      <div className="bg-surface-raised rounded-xl p-4 space-y-3">
        <div className="text-xl font-semibold text-text-primary">
          {used} <span className="text-text-secondary font-normal text-base">/ {limit} {t("data.messages")}</span>
        </div>
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${remaining <= 5 ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-[12px] text-text-secondary">{t("data.resetsAt")}</div>
      </div>

      <div className="border-t border-border" />

      <div className="text-[13px] font-semibold text-text-primary">{t("data.yourData")}</div>

      {/* Export */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-primary">{t("data.exportTitle")}</div>
          <div className="text-[12px] text-text-secondary mt-0.5">{t("data.exportDesc")}</div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="btn-secondary text-sm px-4 py-1.5 shrink-0"
        >
          {isExporting ? t("data.exporting") : t("data.export")}
        </button>
      </div>

      {/* Delete account */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-danger">{t("data.deleteAccountTitle")}</div>
          <div className="text-[12px] text-text-secondary mt-0.5">{t("data.deleteAccountDesc")}</div>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-danger text-sm px-4 py-1.5 shrink-0"
        >
          {t("data.deleteAccount")}
        </button>
      </div>
    </div>
  );

  const contentMap: Record<SubMenu, React.ReactNode> = {
    profile: profileContent,
    appearance: appearanceContent,
    data: dataContent,
  };

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-[6px] animate-modal-overlay-enter"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-[101] flex items-end md:items-center justify-center md:p-4"
        onClick={handleOverlayClick}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("settings.title")}
          tabIndex={-1}
          className="bg-surface border-t md:border border-border rounded-t-2xl md:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full md:max-w-[880px] h-[85vh] md:h-[min(640px,85vh)] flex flex-col md:flex-row overflow-hidden animate-modal-enter focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Mobile Header & Tab Strip ────────────────── */}
          <div className="md:hidden flex flex-col bg-surface-raised border-b border-border shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">{t("settings.title")}</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md transition-colors"
                aria-label={t("settings.close")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {/* Tab Strip */}
            <div className="flex px-4 pb-2 gap-2 overflow-x-auto no-scrollbar">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectMenu(item.id)}
                  className={`flex items-center whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeMenu === item.id
                      ? "bg-accent-alpha text-accent"
                      : "text-text-secondary hover:text-text-primary bg-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Left column / nav (desktop) ────────────────── */}
          <div className="hidden md:flex md:w-[220px] shrink-0 bg-surface-raised border-r border-border flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <span className="text-base font-semibold text-text-primary">{t("settings.title")}</span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md transition-colors"
                aria-label={t("settings.close")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                    activeMenu === item.id
                      ? "bg-accent-alpha text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Right column / content ─────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 md:p-8 md:pt-8 pt-4 animate-fade-in max-w-2xl mx-auto">
              {contentMap[activeMenu]}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────── */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-[102] bg-black/40 dark:bg-black/60 backdrop-blur-[6px] animate-modal-overlay-enter" />
          <div className="fixed inset-0 z-[103] flex items-center justify-center p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-label={t("settings.confirmDelete")}
              className="bg-surface border border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.24)] w-full max-w-[400px] p-6 space-y-4 animate-modal-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-danger">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-base font-semibold">{t("data.deleteConfirmTitle")}</span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed">
                {t("data.deleteConfirmDesc")}
              </p>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-ghost text-sm px-4 py-2"
                  disabled={isDeleting}
                >
                  {t("message.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="btn-danger text-sm px-4 py-2"
                >
                  {isDeleting ? t("data.deleting") : t("data.deleteConfirmBtn")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
