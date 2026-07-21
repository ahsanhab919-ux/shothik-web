import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireAnyAuth: vi.fn(),
  createTwinClient: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("@/lib/twin-api-auth", () => ({
  authenticateTwinRequest: mocks.authenticateTwinRequest,
  requireAnyAuth: mocks.requireAnyAuth,
}));

vi.mock("@/lib/twin-convex", () => ({
  twinApi: {
    twin: {
      getByMaster: "getByMaster",
      twinStartBook: "twinStartBook",
      twinUpdateBookContent: "twinUpdateBookContent",
      twinAdvanceBookContentState: "twinAdvanceBookContentState",
      twinUpdateBookMetadata: "twinUpdateBookMetadata",
      logActivity: "logActivity",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

import { POST } from "../route";

describe("POST /api/twin/book/write/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyAuth.mockReturnValue(true);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
  });

  it("creates a book draft for a twin-key caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      keyHash: "key-hash",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.mutation.mockResolvedValue("book-1");

    const response = await POST({
      json: async () => ({
        operation: "start",
        title: "Governed Draft",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      operation: "start",
      bookId: "book-1",
      status: "created",
      previousState: null,
      newState: "draft",
    });
    expect(mocks.mutation).toHaveBeenCalledWith("twinStartBook", {
      twinId: "twin-1",
      title: "Governed Draft",
      keyHash: "key-hash",
    });
  });

  it("uploads content and advances state for a user-session caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      token: "jwt-token",
      userId: "user-1",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.query.mockResolvedValue({ _id: "twin-1" });
    mocks.mutation
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({
        previousState: "draft",
        newState: "agent_generated",
      })
      .mockResolvedValueOnce(undefined);

    const response = await POST({
      json: async () => ({
        operation: "upload",
        bookId: "book-1",
        content: "Generated content",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      operation: "upload",
      bookId: "book-1",
      status: "state_advanced",
      previousState: "draft",
      newState: "agent_generated",
    });
    expect(mocks.query).toHaveBeenCalledWith("getByMaster", {
      masterId: "user-1",
    });
  });

  it("returns 400 when operation is invalid", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      userId: "user-1",
      ability: { can: vi.fn().mockReturnValue(true) },
    });

    const response = await POST({
      json: async () => ({
        operation: "unknown",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("operation must be start, upload, or metadata");
  });
});
