"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/chat/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageThread from "@/components/chat/MessageThread";
import Composer from "@/components/chat/Composer";
import SettingsModal from "@/components/chat/SettingsModal";
import { useChat } from "@/hooks/useChat";
import { useSessions } from "@/hooks/useSessions";
import { useRateLimit } from "@/hooks/useRateLimit";
import { getDefaultModel, ModelCatalogEntry } from "@/lib/ai-providers";
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
  };
}

/**
 * Main chat client — orchestrates sidebar, message thread, and composer.
 * This is the core interactive component rendered after server-side auth.
 */
export default function ChatClient({ user }: ChatClientProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelCatalogEntry>(
    getDefaultModel()
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const { quota, refreshQuota } = useRateLimit();

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
  } = useChat({
    sessionId: activeSessionId,
    selectedModel,
    onSessionCreated: (sessionId) => {
      setActiveSessionId(sessionId);
      refreshSessions();
    },
    onMessageComplete: () => {
      refreshQuota();
      refreshSessions();
    },
  });

  // Load messages when session changes
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

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  return (
    <div className="flex h-dvh bg-bg overflow-hidden">
      {/* Sidebar */}
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
        onOpenSettings={handleOpenSettings}
      />

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">


        <div className="flex-1 flex flex-col min-h-0 w-full">
          {/* Chat Header — always visible */}
          {(() => {
            const activeSession = activeSessionId
              ? sessions.find(s => s.id === activeSessionId)
              : null;
            return (
              <ChatHeader
                sessionTitle={activeSession?.title ?? null}
                isPinned={activeSession?.isPinned ?? null}
                onRename={activeSession ? (newTitle) => renameSession(activeSessionId!, newTitle) : () => {}}
                onTogglePin={activeSession ? () => togglePin(activeSessionId!, !activeSession.isPinned) : () => {}}
                onDelete={activeSession ? () => handleDeleteSession(activeSessionId!) : () => {}}
                hasSession={!!activeSession}
              />
            );
          })()}

          {messages.length === 0 && !streamingContent && !isStreaming ? (
            /* ── Empty / Welcome State — centered greeting + composer ── */
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
                <Composer
                  selectedModel={selectedModel}
                  onModelSelect={setSelectedModel}
                  onSend={sendMessage}
                  onStop={stopGeneration}
                  isStreaming={isStreaming}
                  quota={quota ? { remaining: quota.remaining, limit: quota.limit } : undefined}
                />
              </div>
            </div>
          ) : (
            /* ── Active Chat — normal thread + bottom composer ── */
            <>
              <MessageThread
                messages={messages}
                truncationIndex={truncationIndex}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                onEditMessage={editMessage}
                onRegenerateFrom={regenerateFrom}
                displayName={user.preferredName || user.name}
              />
              <Composer
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                onSend={sendMessage}
                onStop={stopGeneration}
                isStreaming={isStreaming}
                quota={quota ? { remaining: quota.remaining, limit: quota.limit } : undefined}
              />
            </>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        quota={quota ? { remaining: quota.remaining, limit: quota.limit } : undefined}
      />
    </div>
  );
}

