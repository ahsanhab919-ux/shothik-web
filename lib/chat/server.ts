"use server";

import type { PoolClient } from "pg";
import { insforgeQuery, withInsforgeTransaction } from "@/lib/insforge-db";
import type {
  ChatMessage,
  ChatSurface,
  ConversationContextRef,
  ConversationStatus,
  ConversationSummary,
} from "./types";

type ConversationRow = {
  id: string;
  auth_user_id: string | null;
  legacy_user_id: string | null;
  surface: ChatSurface;
  title: string;
  status: ConversationStatus;
  pinned: boolean;
  temporary: boolean;
  model_handle: string | null;
  context_ref: ConversationContextRef | null;
  last_message_at: Date;
  last_message_preview: string | null;
  message_count: number;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  auth_user_id: string | null;
  legacy_user_id: string | null;
  role: ChatMessage["role"];
  content: string;
  content_format: ChatMessage["contentFormat"];
  status: ChatMessage["status"];
  model_handle: string | null;
  parent_message_id: string | null;
  metadata: ChatMessage["metadata"] | null;
  created_at: Date;
  updated_at: Date;
};

function toMillis(value: Date | string | null | undefined) {
  if (!value) return Date.now();
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function toConversation(row: ConversationRow): ConversationSummary {
  return {
    _id: row.id,
    userId: row.auth_user_id ?? row.legacy_user_id ?? "",
    surface: row.surface,
    title: row.title,
    status: row.status,
    pinned: row.pinned,
    temporary: row.temporary,
    modelHandle: row.model_handle ?? undefined,
    contextRef: row.context_ref ?? undefined,
    lastMessageAt: toMillis(row.last_message_at),
    lastMessagePreview: row.last_message_preview ?? undefined,
    messageCount: row.message_count,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    _id: row.id,
    conversationId: row.conversation_id,
    userId: row.auth_user_id ?? row.legacy_user_id ?? "",
    role: row.role,
    content: row.content,
    contentFormat: row.content_format,
    status: row.status,
    modelHandle: row.model_handle ?? undefined,
    parentMessageId: row.parent_message_id ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function normalizeTitle(input?: string | null) {
  const title = input?.trim();
  return title ? title.slice(0, 240) : "New chat";
}

function normalizeQuery(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

async function runQuery<T>(
  client: PoolClient | null,
  text: string,
  params: unknown[] = []
) {
  if (client) {
    return client.query<T>(text, params);
  }
  return insforgeQuery<T>(text, params);
}

async function getConversationRowForUser(
  client: PoolClient | null,
  conversationId: string,
  userId: string
) {
  const result = await runQuery<ConversationRow>(
    client,
    `
      select *
      from public.chat_conversations
      where id = $1
        and auth_user_id = $2::uuid
      limit 1
    `,
    [conversationId, userId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Conversation not found");
  }
  return row;
}

async function getMessageRowForUser(client: PoolClient | null, messageId: string, userId: string) {
  const result = await runQuery<MessageRow>(
    client,
    `
      select *
      from public.chat_messages
      where id = $1
        and auth_user_id = $2::uuid
      limit 1
    `,
    [messageId, userId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Message not found");
  }
  return row;
}

export async function listConversationsForUser(input: {
  userId: string;
  surface?: ChatSurface;
  status?: ConversationStatus;
  includeTemporary?: boolean;
  limit?: number;
  query?: string;
}) {
  const params: unknown[] = [input.userId];
  const where: string[] = ["auth_user_id = $1::uuid"];

  if (input.surface) {
    params.push(input.surface);
    where.push(`surface = $${params.length}`);
  }

  if (input.status) {
    params.push(input.status);
    where.push(`status = $${params.length}`);
  } else {
    where.push(`status <> 'deleted'`);
  }

  if (!input.includeTemporary) {
    where.push("temporary = false");
  }

  const needle = input.query?.trim();
  if (needle) {
    params.push(`%${normalizeQuery(needle)}%`);
    const idx = params.length;
    where.push(`(title ilike $${idx} or coalesce(last_message_preview, '') ilike $${idx})`);
  }

  params.push(Math.max(1, Math.min(input.limit ?? (needle ? 20 : 50), needle ? 100 : 200)));

  const result = await insforgeQuery<ConversationRow>(
    `
      select *
      from public.chat_conversations
      where ${where.join(" and ")}
      order by updated_at desc
      limit $${params.length}
    `,
    params
  );

  return result.rows.map(toConversation);
}

export async function getConversationForUser(conversationId: string, userId: string) {
  return toConversation(await getConversationRowForUser(null, conversationId, userId));
}

export async function createPersistedConversation(input: {
  userId: string;
  surface: ChatSurface;
  title?: string;
  modelHandle?: string;
  temporary?: boolean;
  contextRef?: ConversationContextRef;
}) {
  const result = await insforgeQuery<ConversationRow>(
    `
      insert into public.chat_conversations (
        auth_user_id,
        surface,
        title,
        model_handle,
        temporary,
        context_ref
      )
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [
      input.userId,
      input.surface,
      normalizeTitle(input.title),
      input.modelHandle ?? null,
      input.temporary ?? false,
      input.contextRef ?? null,
    ]
  );

  return toConversation(result.rows[0]);
}

export async function updateConversationForUser(input: {
  conversationId: string;
  userId: string;
  title?: string;
  pinned?: boolean;
  archived?: boolean;
}) {
  await getConversationRowForUser(null, input.conversationId, input.userId);

  const sets: string[] = [];
  const params: unknown[] = [input.conversationId, input.userId];

  if (typeof input.title === "string") {
    params.push(normalizeTitle(input.title));
    sets.push(`title = $${params.length}`);
  }

  if (typeof input.pinned === "boolean") {
    params.push(input.pinned);
    sets.push(`pinned = $${params.length}`);
  }

  if (typeof input.archived === "boolean") {
    params.push(input.archived ? "archived" : "active");
    sets.push(`status = $${params.length}`);
  }

  if (sets.length === 0) {
    return await getConversationForUser(input.conversationId, input.userId);
  }

  const result = await insforgeQuery<ConversationRow>(
    `
      update public.chat_conversations
      set ${sets.join(", ")}
      where id = $1
        and auth_user_id = $2::uuid
      returning *
    `,
    params
  );

  return toConversation(result.rows[0]);
}

export async function softDeleteConversationForUser(conversationId: string, userId: string) {
  await getConversationRowForUser(null, conversationId, userId);
  await insforgeQuery(
    `
      update public.chat_conversations
      set status = 'deleted'
      where id = $1
        and auth_user_id = $2::uuid
    `,
    [conversationId, userId]
  );
  return { success: true };
}

export async function listMessagesForConversation(input: {
  conversationId: string;
  userId: string;
  limit?: number;
}) {
  await getConversationRowForUser(null, input.conversationId, input.userId);
  const result = await insforgeQuery<MessageRow>(
    `
      select *
      from public.chat_messages
      where conversation_id = $1
      order by created_at asc
      limit $2
    `,
    [input.conversationId, Math.max(1, Math.min(input.limit ?? 200, 500))]
  );

  return result.rows.map(toMessage);
}

export async function appendPersistedUserMessage(input: {
  conversationId: string;
  userId: string;
  content: string;
}) {
  return withInsforgeTransaction(async (client) => {
    await getConversationRowForUser(client, input.conversationId, input.userId);
    const result = await client.query<MessageRow>(
      `
        insert into public.chat_messages (
          conversation_id,
          auth_user_id,
          role,
          content,
          content_format,
          status
        )
        values ($1, $2, 'user', $3, 'plain', 'completed')
        returning *
      `,
      [input.conversationId, input.userId, input.content]
    );

    return toMessage(result.rows[0]);
  });
}

export async function createPersistedAssistantMessage(input: {
  conversationId: string;
  userId: string;
  modelHandle?: string;
  parentMessageId?: string;
}) {
  return withInsforgeTransaction(async (client) => {
    await getConversationRowForUser(client, input.conversationId, input.userId);
    const result = await client.query<MessageRow>(
      `
        insert into public.chat_messages (
          conversation_id,
          auth_user_id,
          role,
          content,
          content_format,
          status,
          model_handle,
          parent_message_id
        )
        values ($1, $2, 'assistant', '', 'markdown', 'streaming', $3, $4)
        returning *
      `,
      [input.conversationId, input.userId, input.modelHandle ?? null, input.parentMessageId ?? null]
    );

    return toMessage(result.rows[0]);
  });
}

export async function appendPersistedAssistantChunk(input: {
  messageId: string;
  userId: string;
  delta: string;
}) {
  const message = await getMessageRowForUser(null, input.messageId, input.userId);
  const result = await insforgeQuery<MessageRow>(
    `
      update public.chat_messages
      set content = coalesce(content, '') || $3
      where id = $1
        and auth_user_id = $2::uuid
      returning *
    `,
    [input.messageId, input.userId, input.delta]
  );

  if (!result.rows[0]) {
    return toMessage(message);
  }
  return toMessage(result.rows[0]);
}

export async function completePersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
}) {
  const result = await insforgeQuery<MessageRow>(
    `
      update public.chat_messages
      set status = 'completed'
      where id = $1
        and auth_user_id = $2::uuid
      returning *
    `,
    [input.messageId, input.userId]
  );
  return toMessage(result.rows[0]);
}

export async function stopPersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
}) {
  const result = await insforgeQuery<MessageRow>(
    `
      update public.chat_messages
      set status = 'stopped'
      where id = $1
        and auth_user_id = $2::uuid
      returning *
    `,
    [input.messageId, input.userId]
  );
  return toMessage(result.rows[0]);
}

export async function failPersistedAssistantMessage(input: {
  messageId: string;
  userId: string;
  errorCode?: string;
  fallbackText?: string;
}) {
  const message = await getMessageRowForUser(null, input.messageId, input.userId);
  const metadata = {
    ...(message.metadata ?? {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };

  const result = await insforgeQuery<MessageRow>(
    `
      update public.chat_messages
      set
        content = $3,
        status = 'error',
        metadata = $4
      where id = $1
        and auth_user_id = $2::uuid
      returning *
    `,
    [
      input.messageId,
      input.userId,
      input.fallbackText ?? message.content ?? "Something went wrong.",
      metadata,
    ]
  );

  return toMessage(result.rows[0]);
}

export async function deleteMessageForUser(messageId: string, userId: string) {
  await getMessageRowForUser(null, messageId, userId);
  await insforgeQuery(
    `
      delete from public.chat_messages
      where id = $1
        and auth_user_id = $2::uuid
    `,
    [messageId, userId]
  );
  return { success: true };
}
