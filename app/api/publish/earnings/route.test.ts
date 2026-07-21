import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAuthenticatedUser, mockGetEarningsSummaryForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetEarningsSummaryForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/http", () => ({
  handleBookRouteError: (error, fallbackMessage) =>
    Response.json(
      {
        error: "INTERNAL_ERROR",
        message: fallbackMessage,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    ),
}));

vi.mock("@/lib/books/insforge-earnings-service", () => ({
  getEarningsSummaryForUser: mockGetEarningsSummaryForUser,
}));

import { GET } from "./route";

describe("publish earnings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });

  it("returns the authenticated user's earnings summary", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetEarningsSummaryForUser.mockResolvedValue({
      totalEarnings: 120.5,
      availableBalance: 55.25,
      monthlyBreakdown: [],
      perBookEarnings: [],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetEarningsSummaryForUser).toHaveBeenCalledWith("user-1");
    expect(data.summary.totalEarnings).toBe(120.5);
    expect(data.summary.availableBalance).toBe(55.25);
  });
});
