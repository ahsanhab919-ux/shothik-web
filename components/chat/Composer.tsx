"use client";

import { Send, Square } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  generating?: boolean;
  placeholder?: string;
  modelHandle?: string;
  onModelChange?: (value: string) => void;
  footer?: string;
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  isStreaming,
  generating,
  placeholder,
  modelHandle,
  onModelChange,
  footer,
}: ComposerProps, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeStreaming = isStreaming ?? generating ?? false;

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-muted-foreground text-xs">Model</label>
          <select
            value={modelHandle ?? "gemini-flash-latest"}
            onChange={(event) => onModelChange?.(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            disabled={disabled || activeStreaming}
          >
            <option value="gemini-flash-latest">Gemini Flash</option>
            <option value="gemini-pro-latest">Gemini Pro</option>
          </select>
        </div>
        <div className="flex items-end gap-3 rounded-2xl border bg-muted/30 p-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder={placeholder ?? "Ask anything..."}
            disabled={disabled}
            className="min-h-[52px] max-h-40 w-full resize-none border-0 bg-transparent text-sm shadow-none outline-none"
          />
          {activeStreaming ? (
            <Button type="button" variant="outline" size="icon" onClick={onStop} aria-label="Stop generating">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        {footer ? <p className="text-center text-xs text-muted-foreground">{footer}</p> : null}
      </div>
    </div>
  );
});
