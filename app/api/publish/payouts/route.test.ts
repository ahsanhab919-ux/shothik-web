import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockListPayoutDataForUser,
  mockCreatePayoutRequestForUser,
  mockExecuteStripePayoutForUser,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockListPayoutDataForUser: vi.fn(),
  mockCreatePayoutRequestForUser: vi.fn(),
  mockExecuteStripePayoutForUser: vi.fn(),
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
  listPayoutDataForUser: mockListPayoutDataForUser,
  createPayoutRequestForUser: mockCreatePayoutRequestForUser,
}));

vi.mock("@/lib/books/stripe-payout-service", () => ({
  executeStripePayoutForUser: mockExecuteStripePayoutForUser,
}));

import { GET, POST } from "./route";

describe("publish payouts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payout history and accounts for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListPayoutDataForUser.mockResolvedValue({
      history: [{ _id: "payout-1", amount: 42 }],
      accounts: [{ _id: "acct-1", method: "stripe" }],
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListPayoutDataForUser).toHaveBeenCalledWith("user-1");
    expect(data.history).toHaveLength(1);
    expect(data.accounts).toHaveLength(1);
  });

  it("rejects incomplete payout requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/payouts", {
        method: "POST",
        body: JSON.stringify({ amount: 42 }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("INVALID_REQUEST");
    expect(mockCreatePayoutRequestForUser).not.toHaveBeenCalled();
  });

  it("creates a pending payout request for non-Stripe methods", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockCreatePayoutRequestForUser.mockResolvedValue({
      _id: "payout-1",
      amount: 42,
      method: "payoneer",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/payouts", {
        method: "POST",
        body: JSON.stringify({
          amount: 42,
          method: "payoneer",
          periodStart: "2026-06",
          periodEnd: "2026-07",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreatePayoutRequestForUser).toHaveBeenCalledWith({
      userId: "user-1",
      amount: 42,
      currency: undefined,
      method: "payoneer",
      periodStart: "2026-06",
      periodEnd: "2026-07",
    });
    expect(data.payout._id).toBe("payout-1");
    expect(mockExecuteStripePayoutForUser).not.toHaveBeenCalled();
  });

  it("executes Stripe payouts immediately through the shared payout service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockExecuteStripePayoutForUser.mockResolvedValue({
      payout: {
        _id: "payout-2",
        method: "stripe",
        status: "completed",
      },
      transfer: {
        transferId: "tr_123",
        status: "paid",
      },
      replayed: false,
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/payouts", {
        method: "POST",
        headers: {
          "idempotency-key": "idem-1",
        },
        body: JSON.stringify({
          amount: 42,
          method: "stripe",
          periodStart: "2026-06",
          periodEnd: "2026-07",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockExecuteStripePayoutForUser).toHaveBeenCalledWith({
      authenticatedUserId: "user-1",
      requestedUserId: "user-1",
      amountInCents: 4200,
      currency: "USD",
      periodStart: "2026-06",
      periodEnd: "2026-07",
      idempotencyKey: "idem-1",
    });
    expect(mockCreatePayoutRequestForUser).not.toHaveBeenCalled();
    expect(data.payout._id).toBe("payout-2");
    expect(data.transfer.transferId).toBe("tr_123");
  });
});
