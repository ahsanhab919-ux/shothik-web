'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export interface UseChatHistoryOptions {
  surface?: string;
  includeArchived?: boolean;
  searchTerm?: string;
}

// Thin client wrapper over the Convex conversation substrate so every chat
// surface consumes one history API: list / search / create / rename / remove /
// pin / archive.
export function useChatHistory(options: UseChatHistoryOptions = {}) {
  const { surface, includeArchived, searchTerm } = options;

  const conversations = useQuery(api.conversations.listConversations, {
    surface,
    includeArchived,
  });

  const searchResults = useQuery(
    api.conversations.searchConversations,
    searchTerm && searchTerm.trim() ? { term: searchTerm } : 'skip'
  );

  const createMutation = useMutation(api.conversations.createConversation);
  const renameMutation = useMutation(api.conversations.renameConversation);
  const deleteMutation = useMutation(api.conversations.deleteConversation);
  const pinMutation = useMutation(api.conversations.setPinned);
  const archiveMutation = useMutation(api.conversations.setArchived);

  const create = useCallback(
    (args: { surface: string; title?: string; model?: string }) =>
      createMutation(args),
    [createMutation]
  );

  const rename = useCallback(
    (conversationId: Id<'conversations'>, title: string) =>
      renameMutation({ conversationId, title }),
    [renameMutation]
  );

  const remove = useCallback(
    (conversationId: Id<'conversations'>) =>
      deleteMutation({ conversationId }),
    [deleteMutation]
  );

  const pin = useCallback(
    (conversationId: Id<'conversations'>, pinned: boolean) =>
      pinMutation({ conversationId, pinned }),
    [pinMutation]
  );

  const archive = useCallback(
    (conversationId: Id<'conversations'>, archived: boolean) =>
      archiveMutation({ conversationId, archived }),
    [archiveMutation]
  );

  const search = useCallback(
    (_term: string) => searchResults ?? [],
    [searchResults]
  );

  return {
    conversations: conversations ?? [],
    searchResults: searchResults ?? [],
    isLoading: conversations === undefined,
    list: conversations ?? [],
    create,
    rename,
    remove,
    pin,
    archive,
    search,
  };
}

export default useChatHistory;
