"use client";

import { useState } from "react";
import { Bot, Check, Copy, RefreshCw, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
import type { ChatMessage } from "./types";

function formatTime(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface MessageActionsProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
}

function MessageActions({
  message,
  isLastAssistant,
  onRegenerate,
  onDelete,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={copy}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Copy message"
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {message.role === "assistant" && isLastAssistant && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Regenerate response"
          title="Regenerate"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500"
          aria-label="Delete message"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
}

function MessageBubble({
  message,
  isLastAssistant,
  onRegenerate,
  onDelete,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
          isUser ? "bg-violet-600" : "bg-brand",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-violet-600 text-white"
              : message.error
                ? "rounded-tl-sm border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                : "rounded-tl-sm bg-muted text-foreground",
          )}
          aria-live={message.streaming ? "polite" : undefined}
          aria-busy={message.streaming || undefined}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : (
            <Markdown content={message.content} />
          )}
          {message.streaming && (
            <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-current align-middle opacity-70" />
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          {message.timestamp && (
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          )}
          {!message.streaming && message.content && (
            <MessageActions
              message={message}
              isLastAssistant={isLastAssistant}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export interface TranscriptProps {
  messages: ChatMessage[];
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function Transcript({
  messages,
  onRegenerate,
  onDelete,
  className,
}: TranscriptProps) {
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className={cn("space-y-4", className)} role="log" aria-label="Chat messages">
      {messages
        .filter((m) => m.role !== "system")
        .map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLastAssistant={message.id === lastAssistantId}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
