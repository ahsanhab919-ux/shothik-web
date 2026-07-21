import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockSyncStripeAccountStatusForUser,
  mockStripeAccountsCreate,
  mockStripeAccountsRetrieve,
  mockStripeAccountLinksCreate,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockSyncStripeAccountStatusForUser: vi.fn(),
  mockStripeAccountsCreate: vi.fn(),
  mockStripeAccountsRetrieve: vi.fn(),
  mockStripeAccountLinksCreate: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/insforge-earnings-service", () => ({
  syncStripeAccountStatusForUser: mockSyncStripeAccountStatusForUser,
}));

vi.mock("stripe", () => ({
  default: vi.fn(function MockStripe() {
    return {
      accounts: {
        create: mockStripeAccountsCreate,
        retrieve: mockStripeAccountsRetrieve,
      },
      accountLinks: {
        create: mockStripeAccountLinksCreate,
      },
    };
  }),
}));

import { GET, POST } from "./route";

describe("stripe connect route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_default");
  });

  it("creates a Stripe account and persists it through the earnings service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      email: "author@example.com",
    });
    mockStripeAccountsCreate.mockResolvedValue({ id: "acct_123" });
    mockStripeAccountLinksCreate.mockResolvedValue({ url: "https://stripe.test/onboard" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/stripe/connect", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          email: "author@example.com",
          returnUrl: "https://app.example.com",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockStripeAccountsCreate).toHaveBeenCalled();
    expect(mockSyncStripeAccountStatusForUser).toHaveBeenCalledWith({
      userId: "user-1",
      accountId: "acct_123",
      payoutsEnabled: false,
      isDefault: true,
    });
    expect(data.accountId).toBe("acct_123");
  });

  it("syncs Stripe onboarding state on status reads", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockStripeAccountsRetrieve.mockResolvedValue({
      id: "acct_123",
      deleted: false,
      payouts_enabled: true,
      charges_enabled: true,
      requirements: { currently_due: [] },
      metadata: { userId: "user-1" },
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/stripe/connect?accountId=acct_123"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSyncStripeAccountStatusForUser).toHaveBeenCalledWith({
      userId: "user-1",
      accountId: "acct_123",
      payoutsEnabled: true,
      isDefault: true,
    });
    expect(data.payoutsEnabled).toBe(true);
  });

  it("returns 503 when preview builds use a non-live Stripe secret in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_MODE", "live");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_preview_only");

    const response = await POST(
      new NextRequest("http://localhost:3000/api/stripe/connect", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          email: "author@example.com",
          returnUrl: "https://app.example.com",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain("live Stripe secret key");
    expect(mockStripeAccountsCreate).not.toHaveBeenCalled();
  });
});
