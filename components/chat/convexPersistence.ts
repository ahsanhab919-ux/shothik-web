import type { ChatMessage, ChatPersistence } from "./types";

export interface ConvexPersistenceDeps {
  getModel: () => string | undefined;
  getActiveId: () => string | null;
  // Called with the resolved conversation id once a conversation exists/created.
  setActiveId: (id: string) => void;
  createConversation: (args: { model?: string }) => Promise<string>;
  appendMessage: (args: {
    conversationId: string;
    role: ChatMessage["role"];
    content: string;
    clientId?: string;
    error?: boolean;
    attachments?: ChatMessage["attachments"];
  }) => Promise<string>;
  deleteMessage: (args: { messageId: string }) => Promise<unknown>;
  deleteMessagesAfter: (args: { messageId: string }) => Promise<unknown>;
}

export interface ConvexPersistence extends ChatPersistence {
  // Clears the in-flight creation promise and the client→server id map.
  // Call when switching to / starting a different conversation.
  reset: () => void;
}

/**
 * Builds the authenticated persistence adapter for the chat substrate.
 *
 * - Serializes lazy conversation creation: concurrent appends in the first turn
 *   share ONE in-flight `createConversation` promise (prevents splitting a turn
 *   across two conversations).
 * - Maps each message's local/client id to the server message id returned by
 *   `appendMessage`, so delete/regenerate can address the right server row even
 *   before a reload has re-seeded ids from the substrate.
 */
export function createConvexPersistence(deps: ConvexPersistenceDeps): ConvexPersistence {
  let creating: Promise<string> | null = null;
  const clientToServer = new Map<string, string>();

  const resolveServerId = (localId: string): string =>
    clientToServer.get(localId) ?? localId;

  const ensureConversation = async (): Promise<string> => {
    const existing = deps.getActiveId();
    if (existing) return existing;
    creating ??= deps.createConversation({ model: deps.getModel() });
    const cid = await creating;
    deps.setActiveId(cid);
    return cid;
  };

  return {
    appendMessage: async (message: ChatMessage) => {
      const conversationId = await ensureConversation();
      const serverId = await deps.appendMessage({
        conversationId,
        role: message.role,
        content: message.content,
        clientId: message.id,
        error: message.error,
        attachments: message.attachments,
      });
      clientToServer.set(message.id, serverId);
    },
    deleteMessage: async (localId: string) => {
      await deps.deleteMessage({ messageId: resolveServerId(localId) });
      clientToServer.delete(localId);
    },
    deleteMessagesAfter: async (localId: string) => {
      await deps.deleteMessagesAfter({ messageId: resolveServerId(localId) });
    },
    reset: () => {
      creating = null;
      clientToServer.clear();
    },
  };
}
