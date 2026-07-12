"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage, ChatPersistence } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

  const persist = useCallback(
    (message: ChatMessage) => {
      if (persistence) {
        Promise.resolve(persistence.appendMessage(message)).catch(() => {});
        return;
      }
      if (storageKey && typeof window !== "undefined") {
        setMessages((prev) => {
          try {
            const toSave = prev
              .filter((m) => !m.streaming && !m.error)
              .slice(-maxStored);
            localStorage.setItem(storageKey, JSON.stringify(toSave));
          } catch {}
          return prev;
        });
      }
    },
    [persistence, storageKey, maxStored],
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
                accumulated += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m,
                  ),
                );
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message) {
                throw parseErr;
              }
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
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? finalMsg : m)),
        );
        persist(finalMsg);
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
    [endpoint, model, context, persist, onError],
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
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: Date.now(),
      };

      let history: { role: string; content: string }[] = [];
      setMessages((prev) => {
        history = [...prev, userMsg]
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));
        return [...prev, userMsg, assistantMsg];
      });
      persist(userMsg);

      await runStream(history, assistantId);
    },
    [isStreaming, persist, runStream],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async () => {
    if (isStreaming) return;
    let lastUser: ChatMessage | undefined;
    setMessages((prev) => {
      const trimmed = [...prev];
      while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
        trimmed.pop();
      }
      lastUser = [...trimmed].reverse().find((m) => m.role === "user");
      return trimmed;
    });
    if (lastUser) {
      await send(lastUser.content, lastUser.attachments);
    }
  }, [isStreaming, send]);

  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      // Deleting a user message deletes that turn (user + following assistant).
      if (prev[idx].role === "user" && prev[idx + 1]?.role === "assistant") {
        return prev.filter((_, i) => i !== idx && i !== idx + 1);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

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
