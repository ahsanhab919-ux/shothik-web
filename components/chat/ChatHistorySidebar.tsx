"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  MessageSquarePlus,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConversationSummary {
  _id: string;
  title: string;
  pinned?: boolean;
  archived?: boolean;
  updatedAt: number;
}

export interface ChatHistorySidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (value: boolean) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleArchive: (id: string, archived: boolean) => void;
  loading?: boolean;
}

export function ChatHistorySidebar({
  conversations,
  activeId,
  includeArchived = false,
  onIncludeArchivedChange,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onTogglePin,
  onToggleArchive,
  loading,
}: ChatHistorySidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const sorted = [...conversations].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  const startEdit = (c: ConversationSummary) => {
    setEditingId(c._id);
    setDraft(c.title);
  };

  const commitEdit = (id: string) => {
    const title = draft.trim();
    if (title) onRename(id, title);
    setEditingId(null);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/20">
      <div className="border-b border-border p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
        {onIncludeArchivedChange && (
          <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => onIncludeArchivedChange(e.target.checked)}
              aria-label="Show archived conversations"
            />
            Show archived
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="p-4 text-center text-xs text-muted-foreground">Loading…</p>
        )}
        {!loading && sorted.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {sorted.map((c) => (
            <li
              key={c._id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
                c._id === activeId ? "bg-accent" : "hover:bg-accent/60",
                c.archived && "opacity-60",
              )}
            >
              {editingId === c._id ? (
                <div className="flex flex-1 items-center gap-1">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(c._id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                    aria-label="Conversation title"
                  />
                  <button onClick={() => commitEdit(c._id)} aria-label="Save title">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} aria-label="Cancel rename">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(c._id)}
                    className="flex flex-1 items-center gap-1.5 truncate text-left"
                    title={c.title}
                  >
                    {c.pinned && <Pin className="h-3 w-3 shrink-0 text-brand" />}
                    <span className="truncate">{c.title}</span>
                  </button>
                  <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onTogglePin(c._id, !c.pinned)}
                      className="rounded p-1 hover:bg-muted"
                      aria-label={c.pinned ? "Unpin conversation" : "Pin conversation"}
                      title={c.pinned ? "Unpin" : "Pin"}
                    >
                      {c.pinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Rename conversation"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onToggleArchive(c._id, !c.archived)}
                      className="rounded p-1 hover:bg-muted"
                      aria-label={c.archived ? "Unarchive conversation" : "Archive conversation"}
                      title={c.archived ? "Unarchive" : "Archive"}
                    >
                      {c.archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(c._id)}
                      className="rounded p-1 hover:bg-muted hover:text-red-500"
                      aria-label="Delete conversation"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
