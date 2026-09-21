"use client";

import { useState, useCallback, useEffect } from "react";
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
}

export default function ChatClient({ user }: ChatClientProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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

  // D3: stable callbacks so useChat's sendMessage keeps its identity.
  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      refreshSessions();
    },
    [refreshSessions]
  );
  const handleMessageComplete = useCallback(() => {
    refreshSessions();
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

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      clearMessages();
    }
  }, [activeSessionId, loadMessages, clearMessages]);

  const handleNewChat = useCallback(async () => {
    setActiveSessionId(null);
    clearMessages();
  }, [clearMessages]);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === activeSessionId) return;
      setActiveSessionId(id);
      setFallbackSession(null);
    },
    [activeSessionId]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        clearMessages();
      }
    },
    [deleteSession, activeSessionId, clearMessages]
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
      setActiveSessionId(id);
      setFallbackSession({ id, title, isPinned });
      setIsAllChatsOpen(false);
    },
    []
  );

  const openManageProviders = useCallback(() => handleOpenSettings("providers"), [handleOpenSettings]);
  const openProfileSettings = useCallback(() => handleOpenSettings("profile"), [handleOpenSettings]);

  const composer = (key: string) => (
    <Composer
      key={key}
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
                {composer("welcome")}
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
              {composer("thread")}
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
