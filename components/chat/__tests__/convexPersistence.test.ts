import { describe, it, expect, vi } from "vitest";
import { createConvexPersistence } from "../convexPersistence";

function baseDeps(overrides: Partial<Parameters<typeof createConvexPersistence>[0]> = {}) {
  return {
    getModel: () => "gemini-2.5-flash",
    getActiveId: () => null as string | null,
    setActiveId: vi.fn(),
    createConversation: vi.fn(async () => "conv_default"),
    appendMessage: vi.fn(async () => "server_default"),
    deleteMessage: vi.fn(async () => undefined),
    deleteMessagesAfter: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("createConvexPersistence — serialized lazy creation (F3)", () => {
  it("creates exactly ONE conversation when two appends race in the first turn", async () => {
    let createCalls = 0;
    let resolveCreate!: (id: string) => void;
    const createConversation = vi.fn(() => {
      createCalls += 1;
      return new Promise<string>((res) => {
        resolveCreate = res;
      });
    });
    let activeId: string | null = null;
    const appendMessage = vi.fn(async (_a: any) => "server_" + Math.random());
    const adapter = createConvexPersistence(
      baseDeps({
        getActiveId: () => activeId,
        setActiveId: (id) => {
          activeId = id;
        },
        createConversation,
        appendMessage,
      }),
    );

    // User + assistant appends both fire before createConversation resolves.
    const p1 = adapter.appendMessage({ id: "u1", role: "user", content: "hi" });
    const p2 = adapter.appendMessage({ id: "a1", role: "assistant", content: "yo" });
    resolveCreate("conv_1");
    await Promise.all([p1, p2]);

    expect(createCalls).toBe(1);
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(appendMessage.mock.calls[0][0].conversationId).toBe("conv_1");
    expect(appendMessage.mock.calls[1][0].conversationId).toBe("conv_1");
  });

  it("reuses the existing active conversation without creating", async () => {
    const createConversation = vi.fn(async () => "conv_new");
    const appendMessage = vi.fn(async (_a: any) => "server_1");
    const adapter = createConvexPersistence(
      baseDeps({ getActiveId: () => "conv_existing", createConversation, appendMessage }),
    );
    await adapter.appendMessage({ id: "u1", role: "user", content: "hi" });
    expect(createConversation).not.toHaveBeenCalled();
    expect(appendMessage.mock.calls[0][0].conversationId).toBe("conv_existing");
  });
});

describe("createConvexPersistence — id resolution for delete (F1)", () => {
  it("resolves a client id to its server id from the append map", async () => {
    const appendMessage = vi.fn(async (_a: any) => "server_1");
    const deleteMessage = vi.fn(async () => undefined);
    const adapter = createConvexPersistence(
      baseDeps({ getActiveId: () => "conv_1", appendMessage, deleteMessage }),
    );
    await adapter.appendMessage({ id: "client_1", role: "user", content: "x" });
    await adapter.deleteMessage!("client_1");
    expect(deleteMessage).toHaveBeenCalledWith({ messageId: "server_1" });
  });

  it("falls back to the given id when unmapped (already a server id from seed)", async () => {
    const deleteMessage = vi.fn(async () => undefined);
    const adapter = createConvexPersistence(baseDeps({ deleteMessage }));
    await adapter.deleteMessage!("server_seeded");
    expect(deleteMessage).toHaveBeenCalledWith({ messageId: "server_seeded" });
  });

  it("deleteMessagesAfter resolves the client id to the server id", async () => {
    const appendMessage = vi.fn(async (_a: any) => "server_a");
    const deleteMessagesAfter = vi.fn(async () => undefined);
    const adapter = createConvexPersistence(
      baseDeps({ getActiveId: () => "conv_1", appendMessage, deleteMessagesAfter }),
    );
    await adapter.appendMessage({ id: "client_a", role: "assistant", content: "y" });
    await adapter.deleteMessagesAfter!("client_a");
    expect(deleteMessagesAfter).toHaveBeenCalledWith({ messageId: "server_a" });
  });

  it("reset() clears the in-flight create so a new turn creates a fresh conversation", async () => {
    const createConversation = vi.fn(async () => "conv_1");
    let activeId: string | null = null;
    const adapter = createConvexPersistence(
      baseDeps({
        getActiveId: () => activeId,
        setActiveId: (id) => {
          activeId = id;
        },
        createConversation,
      }),
    );
    await adapter.appendMessage({ id: "u1", role: "user", content: "hi" });
    expect(createConversation).toHaveBeenCalledTimes(1);

    // Simulate switching to a new conversation.
    activeId = null;
    adapter.reset();
    await adapter.appendMessage({ id: "u2", role: "user", content: "again" });
    expect(createConversation).toHaveBeenCalledTimes(2);
  });
});
