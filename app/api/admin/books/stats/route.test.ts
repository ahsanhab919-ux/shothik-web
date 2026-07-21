import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAuthenticatedUser, mockRequireAuthorizedBookAdmin, mockGetBookModerationStats } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockRequireAuthorizedBookAdmin: vi.fn(),
    mockGetBookModerationStats: vi.fn(),
  }));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/authz/admin", () => ({
  requireAuthorizedBookAdmin: mockRequireAuthorizedBookAdmin,
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  getBookModerationStats: mockGetBookModerationStats,
}));

import { GET } from "./route";

describe("GET /api/admin/books/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockRequireAuthorizedBookAdmin).not.toHaveBeenCalled();
    expect(mockGetBookModerationStats).not.toHaveBeenCalled();
  });

  it("returns moderation stats for authorized admins", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "admin-1" });
    mockRequireAuthorizedBookAdmin.mockResolvedValue(undefined);
    mockGetBookModerationStats.mockResolvedValue({
      submitted: 2,
      inReview: 0,
      approved: 1,
      published: 3,
      rejected: 1,
      total: 7,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      stats: {
        submitted: 2,
        inReview: 0,
        approved: 1,
        published: 3,
        rejected: 1,
        total: 7,
      },
    });
  });
});
