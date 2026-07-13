"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { Transcript } from "@/components/chat/Transcript";
import { useChatService, useConversationMessages } from "@/lib/chat/service";
import type { ChatMessage } from "@/lib/chat/types";
import { useTranslation } from "@/i18n";
import { useChatHistory } from "@/hooks/useChatHistory";

export default function ChatAgentPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelHandle, setModelHandle] = useState("gemini-2.5-flash");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { t } = useTranslation();
  const messages = useConversationMessages(conversationId);
  const { deleteMessage } = useChatService();
  const { conversations } = useChatHistory({ surface: "flagship", limit: 20 });

  const SUGGESTIONS = [
    t("chat.suggestion1"),
    t("chat.suggestion2"),
    t("chat.suggestion3"),
    t("chat.suggestion4"),
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversationId || !conversations.length) return;
    setConversationId(String(conversations[0]._id));
  }, [conversationId, conversations]);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    setLoading(true);

    try {
      abortRef.current = new AbortController();

      const history = (messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: "user", content: userText });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          surface: "flagship",
          messages: history,
          modelHandle,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to connect");
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
            if (data.type === "conversation" && data.conversationId) {
              setConversationId(data.conversationId);
            }
            if (data.type === "error") {
              throw new Error(data.error);
            }
            if (data.type === "done") {
              break;
            }
          } catch {}
        }
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };
  const visibleMessages = (messages ?? []).filter((message) => message.role !== "system");
  const isEmpty = visibleMessages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                <Sparkles className="h-8 w-8 text-brand" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">{t("chat.heading")}</h2>
              <p className="mb-8 max-w-sm text-sm text-muted-foreground">
                {t("chat.subheading")}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Transcript
              messages={visibleMessages as ChatMessage[]}
              isStreaming={loading}
              onCopy={(message) => navigator.clipboard.writeText(message.content)}
              onDelete={(message) => deleteMessage(String(message._id))}
              onRegenerate={(message) => {
                const parentPrompt = visibleMessages.find(
                  (candidate) => String(candidate._id) === String(message.parentMessageId)
                );
                if (parentPrompt?.role === "user") {
                  send(parentPrompt.content);
                }
              }}
              onStop={() => abortRef.current?.abort()}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <Composer
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSubmit={() => send()}
        onStop={() => abortRef.current?.abort()}
        disabled={loading}
        isStreaming={loading}
        placeholder={t("chat.placeholder")}
        modelHandle={modelHandle}
        onModelChange={setModelHandle}
        footer={`${t("chat.footer")} · ${modelHandle}`}
      />
    </div>
  );
}
