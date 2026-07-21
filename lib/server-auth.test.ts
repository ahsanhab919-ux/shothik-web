import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}));

vi.mock("@/lib/insforge/server", () => ({
  createInsforgeServerClient: vi.fn(async () => ({
    auth: {
      getCurrentUser: mockGetCurrentUser,
    },
  })),
}));

import { getAuthenticatedUser, getChatAuthenticatedUser } from "@/lib/server-auth";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the native InsForge session when present", async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: {
        user: {
          id: "if-user-1",
          email: "user@example.com",
          userMetadata: { name: "Native User" },
        },
      },
      error: null,
    });

    const user = await getAuthenticatedUser();

    expect(user).toMatchObject({
      _id: "if-user-1",
      authProvider: "insforge",
    });
  });

  it("returns null when the InsForge session is absent", async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const user = await getAuthenticatedUser();

    expect(user).toBeNull();
  });

  it("returns null when no auth source resolves a user", async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const user = await getAuthenticatedUser();

    expect(user).toBeNull();
  });
});

describe("getChatAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the native InsForge user when present", async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: {
        user: {
          id: "if-chat-1",
          email: "chat@example.com",
        },
      },
      error: null,
    });

    const user = await getChatAuthenticatedUser();

    expect(user).toMatchObject({
      _id: "if-chat-1",
      authProvider: "insforge",
    });
  });

  it("does not fall back to the legacy bridge for chat", async () => {
    mockGetCurrentUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const user = await getChatAuthenticatedUser();

    expect(user).toBeNull();
  });
});
