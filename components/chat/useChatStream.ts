"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage, ChatPersistence } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tagged error so an intentional `data.error` payload propagates as a stream
// failure while genuine JSON.parse errors on a malformed line are skipped.
class StreamError extends Error {}

export interface UseChatStreamOptions {
  endpoint?: string;
  model?: string;
  context?: string;
  initialMessages?: ChatMessage[];
  // When provided (authenticated), messages persist via this adapter.
  // When omitted (logged-out), messages persist to localStorage under storageKey.
  persistence?: ChatPersistence | null;
  storageKey?: string;
  maxStored?: number;
  onError?: (error: Error) => void;
}

export interface UseChatStream {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  send: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  stop: () => void;
  regenerate: () => Promise<void>;
  deleteMessage: (id: string) => void;
  isStreaming: boolean;
}

const ERROR_TEXT = "Sorry, something went wrong. Please try again.";

export function useChatStream(options: UseChatStreamOptions = {}): UseChatStream {
  const {
    endpoint = "/api/chat",
    model,
    context,
    initialMessages = [],
    persistence,
    storageKey,
    maxStored = 200,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Mirror of `messages` so send/regenerate can read a snapshot of current
  // state WITHOUT computing it inside a setMessages updater (which is not
  // guaranteed to run synchronously under batching/concurrent rendering).
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const saveLocal = useCallback(
    (msgs: ChatMessage[]) => {
      if (!storageKey || typeof window === "undefined") return;
      try {
        const toSave = msgs.filter((m) => !m.streaming && !m.error).slice(-maxStored);
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch {}
    },
    [storageKey, maxStored],
  );

  // Commit `next` to state + the ref, and persist the logged-out snapshot.
  const commitLocal = useCallback(
    (next: ChatMessage[]) => {
      messagesRef.current = next;
      setMessages(next);
      saveLocal(next);
    },
    [saveLocal],
  );

  const persistAppend = useCallback(
    (message: ChatMessage, snapshot: ChatMessage[]) => {
      if (persistence) {
        Promise.resolve(persistence.appendMessage(message)).catch(() => {});
        return;
      }
      saveLocal(snapshot);
    },
    [persistence, saveLocal],
  );

  const runStream = useCallback(
    async (history: { role: string; content: string }[], assistantId: string) => {
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let accumulated = "";
      let aborted = false;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            ...(model ? { model } : {}),
            ...(context ? { context } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`AI service error (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let data: any;
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              // Malformed / partial `data:` line — skip it, keep streaming.
              continue;
            }
            if (data.done) {
              finished = true;
              break;
            }
            if (data.error) throw new StreamError(data.error);
            if (data.content) {
              accumulated += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m,
                ),
              );
            }
          }
        }

        const finalMsg: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: accumulated,
          streaming: false,
          timestamp: Date.now(),
        };
        const finalSnapshot = messagesRef.current.map((m) =>
          m.id === assistantId ? finalMsg : m,
        );
        messagesRef.current = finalSnapshot;
        setMessages(finalSnapshot);
        persistAppend(finalMsg, finalSnapshot);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, content: accumulated }
                : m,
            ),
          );
        } else {
          const error = err instanceof Error ? err : new Error(ERROR_TEXT);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: ERROR_TEXT, streaming: false, error: true }
                : m,
            ),
          );
          onError?.(error);
        }
      } finally {
        if (!aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m,
            ),
          );
        }
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [endpoint, model, context, persistAppend, onError],
  );

  // Appends a fresh assistant placeholder and streams into it, using the
  // provided base transcript (no new user row is inserted here).
  const streamAssistant = useCallback(
    async (base: ChatMessage[]) => {
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: Date.now(),
      };
      const history = base
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const next = [...base, assistantMsg];
      messagesRef.current = next;
      setMessages(next);

      await runStream(history, assistantId);
    },
    [runStream],
  );

  const send = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      const trimmed = text.trim();
      if ((!trimmed && !attachments?.length) || isStreaming) return;

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        attachments: attachments?.length ? attachments : undefined,
      };

      const base = [...messagesRef.current, userMsg];
      persistAppend(userMsg, base);
      await streamAssistant(base);
    },
    [isStreaming, persistAppend, streamAssistant],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async () => {
    if (isStreaming) return;

    const prev = messagesRef.current;
    const trimmed = [...prev];
    const superseded: ChatMessage[] = [];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
      superseded.unshift(trimmed.pop()!);
    }
    const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    // Authed: drop the superseded assistant turn(s) server-side (keeping the
    // preceding user message) BEFORE re-streaming, so no orphaned assistant
    // rows accumulate and no duplicate user row is inserted.
    if (persistence?.deleteMessagesAfter && superseded.length) {
      try {
        await persistence.deleteMessagesAfter(superseded[0].id);
      } catch {}
    }

    // Commit the trimmed transcript, then stream a fresh assistant reply.
    messagesRef.current = trimmed;
    setMessages(trimmed);
    saveLocal(trimmed);
    await streamAssistant(trimmed);
  }, [isStreaming, persistence, saveLocal, streamAssistant]);

  const deleteMessage = useCallback(
    (id: string) => {
      const prev = messagesRef.current;
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return;

      const removed: ChatMessage[] = [prev[idx]];
      let next: ChatMessage[];
      // Deleting a user message deletes that turn (user + following assistant).
      if (prev[idx].role === "user" && prev[idx + 1]?.role === "assistant") {
        removed.push(prev[idx + 1]);
        next = prev.filter((_, i) => i !== idx && i !== idx + 1);
      } else {
        next = prev.filter((m) => m.id !== id);
      }

      commitLocal(next);

      if (persistence?.deleteMessage) {
        for (const m of removed) {
          Promise.resolve(persistence.deleteMessage(m.id)).catch(() => {});
        }
      }
    },
    [persistence, commitLocal],
  );

  return {
    messages,
    setMessages,
    send,
    stop,
    regenerate,
    deleteMessage,
    isStreaming,
  };
}
