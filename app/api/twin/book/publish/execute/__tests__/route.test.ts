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
      twinAdvanceBookContentState: "twinAdvanceBookContentState",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

import { POST } from "../route";

describe("POST /api/twin/book/publish/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyAuth.mockReturnValue(true);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
  });

  it("publishes an approved book for a twin-key caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      keyHash: "key-hash",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.mutation.mockResolvedValue({
      previousState: "approved",
      newState: "published",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      bookId: "book-1",
      status: "published",
      previousState: "approved",
      newState: "published",
    });
    expect(mocks.mutation).toHaveBeenCalledWith("twinAdvanceBookContentState", {
      twinId: "twin-1",
      bookId: "book-1",
      targetState: "published",
      keyHash: "key-hash",
    });
  });

  it("resolves the twin profile for a user-session caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      token: "jwt-token",
      userId: "user-1",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.query.mockResolvedValue({ _id: "twin-1" });
    mocks.mutation.mockResolvedValue({
      previousState: "approved",
      newState: "published",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-2",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith("getByMaster", {
      masterId: "user-1",
    });
  });

  it("returns 400 when bookId is missing", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      userId: "user-1",
      ability: { can: vi.fn().mockReturnValue(true) },
    });

    const response = await POST({
      json: async () => ({}),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("bookId is required");
  });
});
