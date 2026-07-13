"use client";

import { Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageActions } from "./MessageActions";
import { MarkdownMessage } from "./MarkdownMessage";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/types";

export interface TranscriptMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  contentFormat?: "markdown" | "plain";
  status?: "streaming" | "completed" | "stopped" | "error" | "complete";
  model?: string;
  modelHandle?: string;
  timestamp?: number;
  createdAt?: number;
  parentMessageId?: string;
}

type TranscriptItem = ChatMessage | TranscriptMessage;

interface TranscriptProps {
  messages: TranscriptItem[];
  isStreaming?: boolean;
  onCopy?: (message: TranscriptItem) => void;
  onDelete?: (message: TranscriptItem) => void;
  onRegenerate?: (message: TranscriptItem) => void;
  onStop?: (message: TranscriptItem) => void;
  className?: string;
}

function getMessageId(message: TranscriptItem) {
  return String((message as ChatMessage)._id ?? (message as TranscriptMessage).id);
}

function getCreatedAt(message: TranscriptItem) {
  return (message as ChatMessage).createdAt ?? (message as TranscriptMessage).createdAt ?? (message as TranscriptMessage).timestamp ?? Date.now();
}

function getStatus(message: TranscriptItem) {
  return message.status === "complete" ? "completed" : message.status;
}

export function Transcript({
  messages,
  isStreaming,
  onCopy,
  onDelete,
  onRegenerate,
  onStop,
  className,
}: TranscriptProps) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-4 p-4" aria-live={isStreaming ? "polite" : "off"}>
        {messages.map((message) => {
          const isUser = message.role === "user";
          const status = getStatus(message);
          const createdAt = getCreatedAt(message);
          const contentFormat =
            (message as ChatMessage).contentFormat ??
            (message.role === "assistant" ? "markdown" : "plain");
          const canRegenerate = message.role === "assistant" && status !== "streaming";
          const canStop = message.role === "assistant" && status === "streaming";

          return (
            <div key={getMessageId(message)} className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isUser ? "bg-primary text-primary-foreground" : "bg-brand/10 text-brand"
              )}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
                <div className={cn(
                  "rounded-2xl border px-4 py-3 text-sm shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm border-primary"
                    : "bg-background rounded-tl-sm border-border"
                )}>
                  {contentFormat === "markdown" && !isUser ? (
                    <MarkdownMessage content={message.content || (status === "streaming" ? "Thinking..." : "")} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content || (status === "streaming" ? "Thinking..." : "")}
                    </p>
                  )}
                </div>
                <div className={cn("flex items-center gap-2", isUser ? "justify-end" : "justify-start")}>
                  <span className="text-muted-foreground text-xs">
                    {new Date(createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <MessageActions
                    canRegenerate={canRegenerate}
                    canStop={canStop}
                    onCopy={onCopy ? () => onCopy(message) : undefined}
                    onDelete={onDelete ? () => onDelete(message) : undefined}
                    onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined}
                    onStop={onStop ? () => onStop(message) : undefined}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
