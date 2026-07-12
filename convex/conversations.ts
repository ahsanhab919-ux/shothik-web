import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function getAuthenticatedUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Authentication required: valid JWT token is needed");
  return identity.subject;
}

export const DEFAULT_TITLE = "New chat";
const TITLE_MAX = 50;

function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return DEFAULT_TITLE;
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX)}…` : trimmed;
}

export const listConversations = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    let rows = await ctx.db
      .query("conversations")
      .withIndex("by_user_updated", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (!args.includeArchived) {
      rows = rows.filter((r: any) => !r.archived);
    }

    const search = args.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter((r: any) => r.title.toLowerCase().includes(search));
    }

    return rows;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    // Align the missing-id and foreign-id responses so a caller cannot
    // distinguish "exists but not yours" from "doesn't exist".
    if (!conversation || conversation.userId !== userId) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", args.conversationId))
      .collect();

    messages.sort((a: any, b: any) => a.createdAt - b.createdAt);
    return { conversation, messages };
  },
});

export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId,
      title: args.title?.trim() || DEFAULT_TITLE,
      model: args.model,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const appendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    clientId: v.optional(v.string()),
    error: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
    attachments: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Unauthorized");

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: args.role,
      content: args.content,
      clientId: args.clientId,
      error: args.error,
      metadata: args.metadata,
      attachments: args.attachments,
      createdAt: now,
    });

    const patch: Record<string, unknown> = { updatedAt: now };
    if (
      args.role === "user" &&
      (!conversation.title || conversation.title === DEFAULT_TITLE)
    ) {
      patch.title = deriveTitle(args.content);
    }
    await ctx.db.patch(args.conversationId, patch);

    return messageId;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.userId !== userId) throw new Error("Unauthorized");
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.messageId);
    await ctx.db.patch(message.conversationId, { updatedAt: Date.now() });
  },
});

// Deletes the target message and every message created after it in the same
// conversation (used by regenerate to drop a superseded assistant turn while
// keeping the preceding user message).
export const deleteMessagesAfter = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const target = await ctx.db.get(args.messageId);
    if (!target) throw new Error("Message not found");
    if (target.userId !== userId) throw new Error("Unauthorized");
    const conversation = await ctx.db.get(target.conversationId);
    if (!conversation || conversation.userId !== userId) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", target.conversationId))
      .collect();

    let deleted = 0;
    for (const message of messages) {
      if (message.createdAt >= target.createdAt) {
        await ctx.db.delete(message._id);
        deleted += 1;
      }
    }
    if (deleted > 0) {
      await ctx.db.patch(target.conversationId, { updatedAt: Date.now() });
    }
    return deleted;
  },
});

export const renameConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.conversationId, {
      title: args.title.trim() || DEFAULT_TITLE,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(args.conversationId);
  },
});

export const setConversationFlags = mutation({
  args: {
    conversationId: v.id("conversations"),
    pinned: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Unauthorized");

    const patch: Record<string, unknown> = {};
    if (args.pinned !== undefined) patch.pinned = args.pinned;
    if (args.archived !== undefined) patch.archived = args.archived;
    if (Object.keys(patch).length === 0) return;
    patch.updatedAt = Date.now();
    await ctx.db.patch(args.conversationId, patch);
  },
});
