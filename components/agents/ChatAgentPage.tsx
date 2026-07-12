"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTranslation } from "@/i18n";
import { Transcript } from "@/components/chat/Transcript";
import { Composer, CHAT_MODEL_OPTIONS } from "@/components/chat/Composer";
import { ChatHistorySidebar } from "@/components/chat/ChatHistorySidebar";
import { useChatStream } from "@/components/chat/useChatStream";
import {
  createConvexPersistence,
  type ConvexPersistence,
} from "@/components/chat/convexPersistence";
import type { ChatMessage } from "@/components/chat/types";

const STORAGE_KEY = "shothik_chat_history";
const MAX_STORED = 200;
const DEFAULT_MODEL = CHAT_MODEL_OPTIONS[0].id;

function loadLocalHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return parsed.filter((m) => m.id && m.role && typeof m.content === "string");
  } catch {
    return [];
  }
}

export default function ChatAgentPage() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authReady = !isLoading;

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [activeId, setActiveId] = useState<Id<"conversations"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<Id<"conversations"> | null>(null);
  const seededRef = useRef<string | null>(null);
  const modelRef = useRef(model);
  activeIdRef.current = activeId;
  modelRef.current = model;

  const conversations = useQuery(
    api.conversations.listConversations,
    authReady && isAuthenticated ? { includeArchived } : "skip",
  );
  const activeData = useQuery(
    api.conversations.getConversation,
    authReady && isAuthenticated && activeId ? { conversationId: activeId } : "skip",
  );

  const createConversation = useMutation(api.conversations.createConversation);
  const appendMessageMut = useMutation(api.conversations.appendMessage);
  const deleteMessageMut = useMutation(api.conversations.deleteMessage);
  const deleteMessagesAfterMut = useMutation(api.conversations.deleteMessagesAfter);
  const renameConversation = useMutation(api.conversations.renameConversation);
  const deleteConversationMut = useMutation(api.conversations.deleteConversation);
  const setConversationFlags = useMutation(api.conversations.setConversationFlags);

  // Authenticated persistence adapter. Held in a ref so its serialized
  // creation promise + client→server id map survive re-renders; rebuilt only
  // when auth resolves. Gated on `authReady` so nothing persists to the wrong
  // store during token resolution (F2).
  const persistenceRef = useRef<ConvexPersistence | null>(null);
  const persistence = useMemo<ConvexPersistence | null>(() => {
    if (!authReady || !isAuthenticated) {
      persistenceRef.current = null;
      return null;
    }
    const adapter = createConvexPersistence({
      getModel: () => modelRef.current,
      getActiveId: () => activeIdRef.current,
      setActiveId: (id) => {
        activeIdRef.current = id as Id<"conversations">;
        seededRef.current = id;
        setActiveId(id as Id<"conversations">);
      },
      createConversation: (a) => createConversation(a),
      appendMessage: (a) =>
        appendMessageMut(a as Parameters<typeof appendMessageMut>[0]),
      deleteMessage: (a) =>
        deleteMessageMut(a as Parameters<typeof deleteMessageMut>[0]),
      deleteMessagesAfter: (a) =>
        deleteMessagesAfterMut(a as Parameters<typeof deleteMessagesAfterMut>[0]),
    });
    persistenceRef.current = adapter;
    return adapter;
  }, [
    authReady,
    isAuthenticated,
    createConversation,
    appendMessageMut,
    deleteMessageMut,
    deleteMessagesAfterMut,
  ]);

  const { messages, setMessages, send, stop, regenerate, deleteMessage, isStreaming } =
    useChatStream({
      model,
      persistence,
      storageKey: authReady && !isAuthenticated ? STORAGE_KEY : undefined,
      maxStored: MAX_STORED,
    });

  // Seed transcript from the substrate (authed) once per conversation switch.
  useEffect(() => {
    if (!authReady || !isAuthenticated || isStreaming) return;
    if (activeId === null) {
      if (seededRef.current !== null) {
        seededRef.current = null;
        setMessages([]);
      }
      return;
    }
    if (activeData?.conversation?._id === activeId && seededRef.current !== activeId) {
      seededRef.current = activeId;
      setMessages(
        activeData.messages.map((m) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          error: m.error,
          attachments: m.attachments,
          timestamp: m.createdAt,
        })),
      );
    }
  }, [isAuthenticated, activeId, activeData, isStreaming, setMessages]);

  // Logged-out: load localStorage history once auth has resolved. Guarded on
  // `authReady` so we never seed logged-out history into an authed session
  // during token resolution (F2).
  useEffect(() => {
    if (!authReady || isAuthenticated) return;
    setMessages(loadLocalHistory());
  }, [authReady, isAuthenticated, setMessages]);

  // Smooth-scroll only when the message COUNT changes, not on every streamed
  // token, to avoid per-chunk re-scroll jank.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleNew = useCallback(() => {
    stop();
    persistenceRef.current?.reset();
    seededRef.current = null;
    activeIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  }, [stop, setMessages]);

  const handleSelect = useCallback(
    (id: string) => {
      stop();
      persistenceRef.current?.reset();
      setActiveId(id as Id<"conversations">);
      setSidebarOpen(false);
    },
    [stop],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationMut({ conversationId: id as Id<"conversations"> });
      if (id === activeIdRef.current) handleNew();
    },
    [deleteConversationMut, handleNew],
  );

  const SUGGESTIONS = [
    t("chat.suggestion1"),
    t("chat.suggestion2"),
    t("chat.suggestion3"),
    t("chat.suggestion4"),
  ];

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const isEmpty = visibleMessages.length === 0;

  // While auth is resolving, do not render the composer/transcript so no send
  // can persist to the wrong store during the loading window (F2).
  if (!authReady) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-brand"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-64px)]">
      {isAuthenticated && sidebarOpen && (
        <ChatHistorySidebar
          conversations={(conversations ?? []).map((c) => ({
            _id: c._id,
            title: c.title,
            pinned: c.pinned,
            archived: c.archived,
            updatedAt: c.updatedAt,
          }))}
          activeId={activeId}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
          onSelect={handleSelect}
          onNew={handleNew}
          onRename={(id, title) =>
            renameConversation({ conversationId: id as Id<"conversations">, title })
          }
          onDelete={handleDeleteConversation}
          onTogglePin={(id, pinned) =>
            setConversationFlags({ conversationId: id as Id<"conversations">, pinned })
          }
          onToggleArchive={(id, archived) =>
            setConversationFlags({ conversationId: id as Id<"conversations">, archived })
          }
          loading={conversations === undefined}
        />
      )}

      <div className="flex flex-1 flex-col">
        {isAuthenticated && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Toggle chat history"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {activeData?.conversation?.title ?? t("chat.heading")}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                  <Sparkles className="h-8 w-8 text-brand" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                  {t("chat.heading")}
                </h2>
                <p className="mb-8 max-w-sm text-sm text-muted-foreground">
                  {t("chat.subheading")}
                </p>
                <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Transcript
                messages={visibleMessages}
                onRegenerate={regenerate}
                onDelete={deleteMessage}
              />
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border bg-background px-4 py-4">
          <Composer
            onSend={send}
            onStop={stop}
            isStreaming={isStreaming}
            placeholder={t("chat.placeholder")}
            model={model}
            onModelChange={setModel}
            footer={t("chat.footer")}
          />
        </div>
      </div>
    </div>
  );
}
