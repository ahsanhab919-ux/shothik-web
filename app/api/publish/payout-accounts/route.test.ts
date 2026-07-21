import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockSavePayoutAccountForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockSavePayoutAccountForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/http", () => ({
  readJsonBody: (request) => request.json(),
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
  savePayoutAccountForUser: mockSavePayoutAccountForUser,
}));

import { POST } from "./route";

describe("publish payout accounts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported payout methods", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/payout-accounts", {
        method: "POST",
        body: JSON.stringify({ method: "wire" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("INVALID_REQUEST");
  });

  it("saves a payout account for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockSavePayoutAccountForUser.mockResolvedValue({
      _id: "acct-1",
      method: "stripe",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/payout-accounts", {
        method: "POST",
        body: JSON.stringify({
          method: "stripe",
          isDefault: true,
          stripeConnectAccountId: "acct_123",
          stripeOnboardingComplete: false,
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSavePayoutAccountForUser).toHaveBeenCalledWith({
      userId: "user-1",
      method: "stripe",
      isDefault: true,
      stripeConnectAccountId: "acct_123",
      stripeOnboardingComplete: false,
      payoneerAccountEmail: undefined,
      payoneerPayeeId: undefined,
      bankDetails: undefined,
    });
    expect(data.payoutAccount._id).toBe("acct-1");
  });
});
