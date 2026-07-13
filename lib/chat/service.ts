"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type {
  ChatMessage,
  ConversationSummary,
  CreateConversationInput,
  ListConversationsInput,
  SearchConversationsInput,
} from "./types";

const chatApi = api as any;

export function useConversationHistory(input?: ListConversationsInput) {
  return useQuery(chatApi.conversations.listConversations, input ?? {});
}

export function useConversationSearch(input: SearchConversationsInput | "skip") {
  return useQuery(chatApi.conversations.searchConversations, input);
}

export function useConversation(conversationId?: string | null) {
  return useQuery(
    chatApi.conversations.getConversation,
    conversationId ? { conversationId: conversationId as any } : "skip"
  ) as ConversationSummary | null | undefined;
}

export function useConversationMessages(conversationId?: string | null, limit = 200) {
  return useQuery(
    chatApi.messages.listMessages,
    conversationId ? { conversationId: conversationId as any, limit } : "skip"
  ) as ChatMessage[] | undefined;
}

export function useChatService() {
  const createConversation = useMutation(chatApi.conversations.createConversation);
  const renameConversation = useMutation(chatApi.conversations.renameConversation);
  const pinConversation = useMutation(chatApi.conversations.pinConversation);
  const archiveConversation = useMutation(chatApi.conversations.archiveConversation);
  const softDeleteConversation = useMutation(chatApi.conversations.softDeleteConversation);
  const appendUserMessage = useMutation(chatApi.messages.appendUserMessage);
  const appendAssistantPlaceholder = useMutation(chatApi.messages.appendAssistantPlaceholder);
  const deleteMessage = useMutation(chatApi.messages.deleteMessage);

  return {
    createConversation: async (input: CreateConversationInput) => {
      return await createConversation(input as any);
    },
    renameConversation: async (conversationId: string, title: string) => {
      return await renameConversation({ conversationId: conversationId as any, title });
    },
    pinConversation: async (conversationId: string, pinned: boolean) => {
      return await pinConversation({ conversationId: conversationId as any, pinned });
    },
    archiveConversation: async (conversationId: string, archived: boolean) => {
      return await archiveConversation({ conversationId: conversationId as any, archived });
    },
    deleteConversation: async (conversationId: string) => {
      return await softDeleteConversation({ conversationId: conversationId as any });
    },
    appendUserMessage: async (conversationId: string, content: string) => {
      return await appendUserMessage({
        conversationId: conversationId as any,
        content,
        contentFormat: "plain",
      });
    },
    appendAssistantPlaceholder: async (conversationId: string, modelHandle?: string, parentMessageId?: string) => {
      return await appendAssistantPlaceholder({
        conversationId: conversationId as any,
        modelHandle,
        ...(parentMessageId ? { parentMessageId: parentMessageId as any } : {}),
      });
    },
    deleteMessage: async (messageId: string) => {
      return await deleteMessage({ messageId: messageId as any });
    },
  };
}
