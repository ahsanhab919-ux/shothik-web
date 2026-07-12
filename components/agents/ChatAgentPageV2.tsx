"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTranslation } from "@/i18n";
import { useChatHistory } from "@/hooks/useChatHistory";
import { Transcript, type TranscriptMessage } from "@/components/chat/Transcript";
import { Composer } from "@/components/chat/Composer";

const SURFACE = "agents-chat";
const MODEL = "gemini-2.5-flash";
const LEGACY_STORAGE_KEY = "shothik_chat_history";
const MIGRATED_FLAG = "shothik_chat_migrated_v2";

type LegacyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

function loadLegacyHistory(): LegacyMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyMessage[];
    return parsed.filter((m) => m.id && m.role && typeof m.content === "string");
  } catch {
    return [];
  }
}

export default function ChatAgentPageV2() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const migratedRef = useRef(false);
  const hydratedRef = useRef(false);

  const { conversations } = useChatHistory({ surface: SURFACE });
  const createConversation = useMutation(api.conversations.createConversation);
  const addMessage = useMutation(api.messages.addMessage);
  const updateMessage = useMutation(api.messages.updateMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const persistedMessages = useQuery(
    api.messages.listMessages,
    conversationId ? { conversationId } : "skip"
  );

  const SUGGESTIONS = [
    t("chat.suggestion1"),
    t("chat.suggestion2"),
    t("chat.suggestion3"),
    t("chat.suggestion4"),
  ];

  // Adopt the most recent existing substrate conversation for this surface.
  useEffect(() => {
    if (conversationId || conversations.length === 0) return;
    setConversationId(conversations[0]._id as Id<"conversations">);
  }, [conversations, conversationId]);

  // Hydrate local transcript from persisted messages (returning authed users).
  useEffect(() => {
    if (generating || hydratedRef.current || !persistedMessages) return;
    if (persistedMessages.length === 0) return;
    setMessages(
      persistedMessages.map((m: any) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        status: m.status,
        model: m.model,
        timestamp: m.createdAt,
      }))
    );
    hydratedRef.current = true;
  }, [persistedMessages, generating]);

  // One-time, read-only migration of legacy localStorage history into Convex.
  useEffect(() => {
    if (migratedRef.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATED_FLAG)) return;
    if (conversations === undefined) return;
    if (conversations.length > 0) return;

    const legacy = loadLegacyHistory();
    if (legacy.length === 0) return;
    migratedRef.current = true;

    // Show immediately so nothing appears lost while the import runs.
    setMessages(
      legacy.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        status: "complete",
      }))
    );

    (async () => {
      try {
        const newId = (await createConversation({
          surface: SURFACE,
          title: legacy[0]?.content?.slice(0, 60) || "Imported Chat",
          model: MODEL,
        })) as Id<"conversations">;
        for (const m of legacy) {
          await addMessage({
            conversationId: newId,
            role: m.role,
            content: m.content,
            status: "complete",
          });
        }
        setConversationId(newId);
        hydratedRef.current = true;
        localStorage.setItem(MIGRATED_FLAG, "1");
      } catch {
        // Unauthenticated or offline: keep legacy data on screen and retry later.
        migratedRef.current = false;
      }
    })();
  }, [conversations, createConversation, addMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = useCallback(
    async (firstText: string): Promise<Id<"conversations"> | null> => {
      if (conversationId) return conversationId;
      try {
        const id = (await createConversation({
          surface: SURFACE,
          title: firstText.slice(0, 60) || "New Chat",
          model: MODEL,
        })) as Id<"conversations">;
        setConversationId(id);
        hydratedRef.current = true;
        return id;
      } catch {
        return null;
      }
    },
    [conversationId, createConversation]
  );

  const runCompletion = useCallback(
    async (history: { role: string; content: string }[], assistantId: string, convId: Id<"conversations"> | null) => {
      const controller = new AbortController();
      abortRef.current = controller;
      let finalText = "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Failed to connect");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.error) throw new Error(data.error);
              if (data.content) {
                finalText += data.content;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + data.content } : m))
                );
              }
            } catch {}
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          finalText = finalText || "";
        } else {
          finalText = "Sorry, something went wrong. Please try again.";
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: finalText, status: "error" } : m))
          );
        }
      } finally {
        abortRef.current = null;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, status: m.status === "error" ? "error" : "complete" } : m))
        );
        setGenerating(false);
        inputRef.current?.focus();
        if (convId && finalText) {
          try {
            await addMessage({
              conversationId: convId,
              role: "assistant",
              content: finalText,
              model: MODEL,
              status: "complete",
            });
          } catch {}
        }
      }
    },
    [addMessage]
  );

  const send = useCallback(
    async (text?: string) => {
      const userText = (text ?? input).trim();
      if (!userText || generating) return;

      const userMsg: TranscriptMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        timestamp: Date.now(),
        status: "complete",
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: TranscriptMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        model: MODEL,
        timestamp: Date.now(),
      };

      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setGenerating(true);

      const convId = await ensureConversation(userText);
      if (convId) {
        try {
          await addMessage({
            conversationId: convId,
            role: "user",
            content: userText,
            status: "complete",
          });
        } catch {}
      }

      await runCompletion(history, assistantId, convId);
    },
    [input, generating, messages, ensureConversation, addMessage, runCompletion]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDelete = useCallback(
    async (message: TranscriptMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      try {
        await deleteMessage({ messageId: message.id as Id<"messages"> });
      } catch {}
    },
    [deleteMessage]
  );

  const handleRegenerate = useCallback(
    async (message: TranscriptMessage) => {
      if (generating) return;
      const idx = messages.findIndex((m) => m.id === message.id);
      if (idx < 0) return;
      const priorUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
      if (!priorUser) return;

      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      try {
        await deleteMessage({ messageId: message.id as Id<"messages"> });
      } catch {}

      const assistantId = crypto.randomUUID();
      const assistantMsg: TranscriptMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        model: MODEL,
        timestamp: Date.now(),
      };
      const history = messages
        .slice(0, idx)
        .map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev.filter((m) => m.id !== message.id), assistantMsg]);
      setGenerating(true);
      await runCompletion(history, assistantId, conversationId);
    },
    [generating, messages, deleteMessage, runCompletion, conversationId]
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Sparkles className="h-8 w-8 text-brand" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">{t("chat.heading")}</h2>
              <p className="mb-8 max-w-sm text-sm text-muted-foreground">{t("chat.subheading")}</p>
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
              messages={messages}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Composer
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={() => send()}
            onStop={stop}
            generating={generating}
            placeholder={t("chat.placeholder")}
            footer={`${t("chat.footer")} · ${MODEL}`}
          />
        </div>
      </div>
    </div>
  );
}
