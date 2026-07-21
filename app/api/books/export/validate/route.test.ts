import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAgentKey,
  mockHashAgentKey,
  mockGetAuthenticatedRequestUser,
  mockGetTwinByKeyHash,
  mockGetBookDraftForUser,
  mockGetBookDraftForOwnerIdentifiers,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockIsAgentKey: vi.fn(),
  mockHashAgentKey: vi.fn(),
  mockGetAuthenticatedRequestUser: vi.fn(),
  mockGetTwinByKeyHash: vi.fn(),
  mockGetBookDraftForUser: vi.fn(),
  mockGetBookDraftForOwnerIdentifiers: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("@/lib/agent-auth", () => ({
  isAgentKey: mockIsAgentKey,
  hashAgentKey: mockHashAgentKey,
}));

vi.mock("@/lib/insforge/request", () => ({
  getAuthenticatedRequestUser: mockGetAuthenticatedRequestUser,
}));

vi.mock("@/lib/twin/insforge-twin-service", () => ({
  getTwinByKeyHash: mockGetTwinByKeyHash,
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  getBookDraftForUser: mockGetBookDraftForUser,
  getBookDraftForOwnerIdentifiers: mockGetBookDraftForOwnerIdentifiers,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
  },
}));

import { POST } from "./route";

describe("export validate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAgentKey.mockReturnValue(false);
    mockGetAuthenticatedRequestUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User One",
    });
    mockGetBookDraftForUser.mockResolvedValue({
      title: "Draft One",
      manuscriptUrl: "https://cdn.example.com/manuscript.epub",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from("epub-content"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ score: 95, issues: [], ready_for: ["epub"] }),
        }),
    );
  });

  it("returns validation results for an authenticated user", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/books/export/validate", {
        method: "POST",
        body: JSON.stringify({
          bookId: "book-1",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fixed).toBe(false);
    expect(mockGetBookDraftForUser).toHaveBeenCalledWith("book-1", "user-1");
  });

  it("rejects suspended agent keys", async () => {
    mockIsAgentKey.mockReturnValue(true);
    mockHashAgentKey.mockReturnValue("hash-1");
    mockGetTwinByKeyHash.mockResolvedValue({
      id: "twin-1",
      masterId: "legacy-user-1",
      masterAuthUserId: "user-1",
      name: "Twin One",
      lifecycleState: "suspended",
      allowedSkills: [],
      blockedSkills: [],
      approvalRequiredActions: [],
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/books/export/validate", {
        method: "POST",
        headers: {
          authorization: "Bearer shothik_agent_123_secret",
        },
        body: JSON.stringify({
          bookId: "book-1",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Agent not found or suspended");
  });
});
