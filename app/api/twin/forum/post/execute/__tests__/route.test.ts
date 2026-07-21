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
      twinCreateForumPost: "twinCreateForumPost",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

import { POST } from "../route";

describe("POST /api/twin/forum/post/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyAuth.mockReturnValue(true);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
  });

  it("returns 400 when forumId is missing", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      userId: "user-1",
      ability: { can: vi.fn().mockReturnValue(true) },
    });

    const response = await POST({
      json: async () => ({ content: "Hello" }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("forumId is required");
  });

  it("creates a forum post for a twin-key caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      keyHash: "key-hash",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.mutation.mockResolvedValue("post-1");

    const response = await POST({
      json: async () => ({
        forumId: "forum-1",
        content: "Governed agent post",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      postId: "post-1",
      forumId: "forum-1",
      status: "created",
    });
    expect(mocks.mutation).toHaveBeenCalledWith("twinCreateForumPost", {
      twinId: "twin-1",
      forumId: "forum-1",
      content: "Governed agent post",
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
    mocks.mutation.mockResolvedValue("post-2");

    const response = await POST({
      json: async () => ({
        forumId: "forum-2",
        content: "Approved user-session post",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith("getByMaster", {
      masterId: "user-1",
    });
    expect(mocks.mutation).toHaveBeenCalledWith("twinCreateForumPost", {
      twinId: "twin-1",
      forumId: "forum-2",
      content: "Approved user-session post",
    });
  });
});
