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
      twinPostCommunityPreview: "twinPostCommunityPreview",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

import { POST } from "../route";

describe("POST /api/twin/book/community-preview/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAnyAuth.mockReturnValue(true);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
  });

  it("posts a community preview for a twin-key caller", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      keyHash: "key-hash",
      ability: { can: vi.fn().mockReturnValue(true) },
    });
    mocks.mutation.mockResolvedValue({
      postId: "post-1",
      previousState: "published",
      newState: "community_preview_posted",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
        forumId: "forum-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      postId: "post-1",
      bookId: "book-1",
      forumId: "forum-1",
      status: "community_preview_posted",
      previousState: "published",
      newState: "community_preview_posted",
    });
    expect(mocks.mutation).toHaveBeenCalledWith("twinPostCommunityPreview", {
      twinId: "twin-1",
      bookId: "book-1",
      forumId: "forum-1",
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
      postId: "post-2",
      previousState: "published",
      newState: "community_preview_posted",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-2",
        forumId: "forum-2",
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith("getByMaster", {
      masterId: "user-1",
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
      json: async () => ({
        bookId: "book-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/forumId is required/i);
  });
});
