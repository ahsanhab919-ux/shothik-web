import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockExecuteStripePayoutForUser,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockExecuteStripePayoutForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/stripe-payout-service", () => ({
  executeStripePayoutForUser: mockExecuteStripePayoutForUser,
  StripePayoutExecutionError: class StripePayoutExecutionError extends Error {
    statusCode;

    constructor(message, statusCode = 400) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { POST } from "./route";

describe("stripe payout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/stripe/payout", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          amount: 2500,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("delegates Stripe payout execution to the shared payout service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockExecuteStripePayoutForUser.mockResolvedValue({
      transfer: {
        transferId: "tr_123",
        amount: 2500,
        currency: "usd",
        status: "paid",
        payout: {
          _id: "payout-1",
        },
      },
      payout: { _id: "payout-1" },
      replayed: false,
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/stripe/payout", {
        method: "POST",
        headers: {
          "idempotency-key": "idem-1",
        },
        body: JSON.stringify({
          userId: "user-1",
          amount: 2500,
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
      amountInCents: 2500,
      currency: "usd",
      stripeAccountId: undefined,
      periodStart: "2026-06",
      periodEnd: "2026-07",
      idempotencyKey: "idem-1",
    });
    expect(data.transferId).toBe("tr_123");
  });
});
