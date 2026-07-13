import {
  appendAssistantChunkInternal,
  appendAssistantPlaceholderInternal,
  appendUserMessageInternal,
  completeAssistantMessageInternal,
  createConversationInternal,
  getConversationInternal,
  failAssistantMessageInternal,
  stopAssistantMessageInternal,
} from "@/lib/convex-server";
import type { ChatSurface, ConversationContextRef } from "./types";

export async function getConversationForUser(conversationId: string, token: string) {
  return await getConversationInternal({
    conversationId,
    userId: token,
  });
}

export async function createPersistedConversation(input: {
  userId: string;
  surface: ChatSurface;
  title?: string;
  modelHandle?: string;
  temporary?: boolean;
  contextRef?: ConversationContextRef;
}) {
  return await createConversationInternal(input);
}

export async function appendPersistedUserMessage(input: {
  conversationId: string;
  userId: string;
  content: string;
}) {
  return await appendUserMessageInternal({
    conversationId: input.conversationId,
    userId: input.userId,
    content: input.content,
    contentFormat: "plain",
  });
}

export async function createPersistedAssistantMessage(input: {
  conversationId: string;
  userId: string;
  modelHandle?: string;
  parentMessageId?: string;
}) {
  return await appendAssistantPlaceholderInternal(input);
}

export async function appendPersistedAssistantChunk(input: {
  messageId: string;
  userId: string;
  delta: string;
}) {
  return await appendAssistantChunkInternal(input);
}

export async function completePersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
}) {
  return await completeAssistantMessageInternal(input);
}

export async function stopPersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
}) {
  return await stopAssistantMessageInternal(input);
}

export async function failPersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
  errorCode?: string;
  fallbackText?: string;
}) {
  return await failAssistantMessageInternal(input);
}
