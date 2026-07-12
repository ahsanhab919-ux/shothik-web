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
  // Tracks the in-flight append per client id, recorded at dispatch time so a
  // delete/regenerate fired before the append resolves can await the real
  // server id instead of addressing the raw (rejected-by-validator) client id.
  // Each entry never rejects: it settles to the server id, or to undefined if
  // the append failed, so resolveServerId can never hang.
  const pendingAppends = new Map<string, Promise<string | undefined>>();

  const resolveServerId = async (localId: string): Promise<string> => {
    const mapped = clientToServer.get(localId);
    if (mapped) return mapped;
    const pending = pendingAppends.get(localId);
    if (pending) {
      const resolved = await pending;
      if (resolved) return resolved;
    }
    // Genuinely unmapped (reload/seed case where the UI id already IS the
    // server id) or the append failed — fall back to best-effort with the id.
    return localId;
  };

  const ensureConversation = async (): Promise<string> => {
    const existing = deps.getActiveId();
    if (existing) return existing;
    creating ??= deps.createConversation({ model: deps.getModel() });
    const cid = await creating;
    deps.setActiveId(cid);
    return cid;
  };

  return {
    appendMessage: (message: ChatMessage) => {
      // Kick off the append and record its pending promise SYNCHRONOUSLY (before
      // any await) so a delete fired in the same tick can serialize behind it.
      const work = (async (): Promise<string> => {
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
        return serverId;
      })();
      // Non-rejecting view awaited by resolveServerId (settles to undefined on
      // failure so a delete after a failed append degrades gracefully).
      pendingAppends.set(
        message.id,
        work.then(
          (id) => id,
          () => undefined,
        ),
      );
      // Return the raw work promise so the caller's fire-and-forget catch still
      // observes append failures (unchanged behavior for useChatStream).
      return work.then(() => undefined);
    },
    deleteMessage: async (localId: string) => {
      const serverId = await resolveServerId(localId);
      await deps.deleteMessage({ messageId: serverId });
      clientToServer.delete(localId);
      pendingAppends.delete(localId);
    },
    deleteMessagesAfter: async (localId: string) => {
      const serverId = await resolveServerId(localId);
      await deps.deleteMessagesAfter({ messageId: serverId });
    },
    reset: () => {
      creating = null;
      clientToServer.clear();
      pendingAppends.clear();
    },
  };
}
