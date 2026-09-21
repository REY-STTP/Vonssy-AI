"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/chat/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageThread from "@/components/chat/MessageThread";
import Composer from "@/components/chat/Composer";
import SettingsModal from "@/components/chat/SettingsModal";
import AllChatsModal from "@/components/chat/AllChatsModal";
import { useChat } from "@/hooks/useChat";
import { useSessions } from "@/hooks/useSessions";
import { useProviders } from "@/hooks/useProviders";
import type { ReasoningEffort } from "@/lib/ai-providers/types";
import { useLocale } from "@/hooks/useLocale";

interface ChatClientProps {
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
    shareProfileWithAi?: boolean | null;
  };
  initialSessionId: string | null;
}

export default function ChatClient({ user, initialSessionId }: ChatClientProps) {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "providers" | "appearance" | "data">("profile");
  const [isAllChatsOpen, setIsAllChatsOpen] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("none");
  const [fallbackSession, setFallbackSession] = useState<{ id: string, title: string | null, isPinned: boolean | null } | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    }
  }, []);

  const {
    sessions,
    renameSession,
    deleteSession,
    togglePin,
    refreshSessions,
  } = useSessions();

  const userProviders = useProviders();
  const { providers, selectedProvider, selectedModel, select, isLoading: providersLoading } = userProviders;

  // Session created mid-stream (first message of a new chat): the URL is
  // synced immediately with replaceState (a real navigation would unmount
  // and abort the in-flight stream), and the session is adopted locally
  // only once the stream settles (handleMessageComplete below).
  const pendingSessionRef = useRef<string | null>(null);

  // D3: stable callbacks so useChat's sendMessage keeps its identity.
  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      refreshSessions();
      pendingSessionRef.current = sessionId;
      window.history.replaceState(null, "", `/chat/${sessionId}`);
    },
    [refreshSessions]
  );
  const handleMessageComplete = useCallback(() => {
    refreshSessions();
    const pending = pendingSessionRef.current;
    pendingSessionRef.current = null;
    if (pending) setActiveSessionId(pending);
  }, [refreshSessions]);

  const {
    messages,
    truncationIndex,
    streamingContent,
    isStreaming,
    sendMessage,
    stopGeneration,
    editMessage,
    regenerateFrom,
    loadMessages,
    clearMessages,
    setFeedback,
  } = useChat({
    sessionId: activeSessionId,
    selectedProvider,
    selectedModel,
    onSessionCreated: handleSessionCreated,
    onMessageComplete: handleMessageComplete,
  });

  // Stay in sync with the route (back/forward navigation remounts with a
  // new initialSessionId; this is belt-and-braces for the same instance).
  useEffect(() => {
    setActiveSessionId(initialSessionId);
    setFallbackSession(null);
  }, [initialSessionId]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      clearMessages();
    }
  }, [activeSessionId, loadMessages, clearMessages]);

  const handleNewChat = useCallback(() => {
    router.push("/chat");
  }, [router]);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === activeSessionId) return;
      router.push(`/chat/${id}`);
    },
    [activeSessionId, router]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      const ok = await deleteSession(id);
      // Stay put when the delete failed (the session was restored above).
      if (ok && activeSessionId === id) {
        router.push("/chat");
      }
    },
    [deleteSession, activeSessionId, router]
  );

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const handleOpenSettings = useCallback((tab: "profile" | "providers" | "appearance" | "data" = "profile") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  }, []);

  const handleOpenAllChats = useCallback(() => {
    setIsAllChatsOpen(true);
  }, []);

  const handleSelectSessionFromAllChats = useCallback(
    (id: string, title: string | null, isPinned: boolean | null) => {
      setFallbackSession({ id, title, isPinned });
      setIsAllChatsOpen(false);
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const openManageProviders = useCallback(() => handleOpenSettings("providers"), [handleOpenSettings]);
  const openProfileSettings = useCallback(() => handleOpenSettings("profile"), [handleOpenSettings]);

  // Single key for both welcome/thread slots: switching between them must
  // NOT remount (that would wipe the in-progress draft when history loads).
  const composer = (
    <Composer
      key="composer"
      providers={providers}
      selectedProvider={selectedProvider}
      selectedModel={selectedModel}
      onProviderSelect={select}
      onSend={sendMessage}
      onStop={stopGeneration}
      isStreaming={isStreaming}
      isProvidersLoading={providersLoading}
      onManageProviders={openManageProviders}
      reasoningEffort={reasoningEffort}
      onReasoningChange={setReasoningEffort}
    />
  );

  return (
    <div className="flex h-dvh bg-bg overflow-hidden">
      {/* G6: skip link for keyboard / screen-reader users. */}
      <a
        href="#chat-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:bg-surface focus:text-text-primary focus:px-3 focus:py-2 focus:rounded-lg focus:border focus:border-border text-sm"
      >
        {t("message.skipToChat")}
      </a>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onRenameSession={renameSession}
        onDeleteSession={handleDeleteSession}
        onTogglePin={togglePin}
        user={user}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onOpenSettings={openProfileSettings}
        onOpenAllChats={handleOpenAllChats}
      />

      <main id="chat-main" tabIndex={-1} className="flex-1 flex flex-col min-w-0 min-h-0 relative focus:outline-none">
        <div className="flex-1 flex flex-col min-h-0 w-full">
          {(() => {
            const activeSession = activeSessionId
              ? sessions.find(s => s.id === activeSessionId) || (fallbackSession?.id === activeSessionId ? fallbackSession : null)
              : null;
            return (
              <ChatHeader
                sessionTitle={activeSession?.title ?? null}
                isPinned={activeSession?.isPinned ?? null}
                onRename={activeSession ? (newTitle) => {
                  renameSession(activeSessionId!, newTitle);
                  if (fallbackSession?.id === activeSessionId) {
                    setFallbackSession({ ...fallbackSession, title: newTitle });
                  }
                } : () => {}}
                onTogglePin={activeSession ? () => {
                  togglePin(activeSessionId!, !activeSession.isPinned);
                  if (fallbackSession?.id === activeSessionId) {
                    setFallbackSession({ ...fallbackSession, isPinned: !activeSession.isPinned });
                  }
                } : () => {}}
                onDelete={activeSession ? () => handleDeleteSession(activeSessionId!) : () => {}}
                hasSession={!!activeSession}
              />
            );
          })()}

          {messages.length === 0 && !streamingContent && !isStreaming ? (
            <div className="flex-1 flex flex-col items-center justify-start pt-[15vh] md:justify-center md:pt-0 px-4 pb-8">
              <div className="flex flex-col items-center text-center mb-8 animate-fade-in">
                <h2 className="font-body font-medium text-2xl text-text-primary mb-2">
                  {(user.preferredName || user.name)
                    ? t("welcome.greeting", { name: (user.preferredName || user.name) as string })
                    : t("welcome.greetingAnon")}
                </h2>
                <p className="text-text-secondary text-base font-body max-w-md mt-2">
                  {t("welcome.subtitle")}
                </p>
              </div>
              <div className="w-full max-w-2xl">
                {composer}
              </div>
            </div>
          ) : (
            <>
              <MessageThread
                messages={messages}
                truncationIndex={truncationIndex}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                onEditMessage={editMessage}
                onRegenerateFrom={regenerateFrom}
                onFeedback={setFeedback}
                displayName={user.preferredName || user.name}
              />
              {composer}
            </>
          )}
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        initialTab={settingsTab}
        userProviders={userProviders}
      />

      <AllChatsModal
        isOpen={isAllChatsOpen}
        onClose={() => setIsAllChatsOpen(false)}
        onSelectSession={handleSelectSessionFromAllChats}
        onDeleteSession={handleDeleteSession}
        onRenameSession={renameSession}
        onTogglePin={togglePin}
      />
    </div>
  );
}
