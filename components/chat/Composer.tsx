"use client";

import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "./types";

export interface ChatModelOption {
  id: string;
  label: string;
}

// Curated subset of the /api/chat allow-list (app/api/chat/models.ts).
export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export interface ComposerProps {
  onSend: (text: string, attachments?: ChatAttachment[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  model?: string;
  onModelChange?: (model: string) => void;
  models?: ChatModelOption[];
  attachments?: ChatAttachment[];
  onAttach?: () => void;
  onRemoveAttachment?: (index: number) => void;
  maxLength?: number;
  footer?: string;
}

export function Composer({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Type a message...",
  model,
  onModelChange,
  models = CHAT_MODEL_OPTIONS,
  attachments = [],
  onRemoveAttachment,
  maxLength = 4000,
  footer,
}: ComposerProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isStreaming || disabled) return;
    onSend(text, attachments.length ? attachments : undefined);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs"
            >
              <span className="max-w-[150px] truncate">{file.name}</span>
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment(idx)}
                  className="hover:text-red-500"
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
        {onModelChange && models.length > 0 && (
          <select
            value={model ?? models[0].id}
            onChange={(e) => onModelChange(e.target.value)}
            aria-label="Model"
            className="shrink-0 self-center rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={maxLength}
          disabled={disabled}
          suppressHydrationWarning
          aria-label="Message input"
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          style={{ maxHeight: "120px" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />

        {isStreaming && onStop ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30"
            aria-label="Stop generating"
            title="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={(!input.trim() && attachments.length === 0) || disabled}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-opacity",
              "hover:opacity-80 disabled:opacity-40",
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
      {footer && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}
