import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayoutManager } from "./PayoutManager";

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        user: {
          _id: "user-1",
          email: "author@example.com",
        },
      },
    }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe("PayoutManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads payout data and submits a payout request through the new route", async () => {
    global.fetch = vi.fn().mockImplementation(async (input, init) => {
      if (input === "/api/publish/earnings") {
        return {
          ok: true,
          json: async () => ({
            summary: {
              totalEarnings: 120.5,
              totalUnitsSold: 22,
              lifetimeRevenue: 160.75,
              availableBalance: 30,
              totalPaidOut: 40,
              pendingPayouts: 10,
              publishedBooksCount: 2,
              monthlyBreakdown: [],
              perBookEarnings: [],
            },
          }),
        };
      }

      if (input === "/api/publish/payouts" && (!init || init.method === undefined)) {
        return {
          ok: true,
          json: async () => ({
            history: [
              {
                _id: "payout-1",
                amount: 15,
                status: "completed",
                method: "stripe",
                createdAt: Date.now(),
                periodStart: "2026-05",
                periodEnd: "2026-06",
              },
            ],
            accounts: [
              {
                _id: "acct-1",
                method: "stripe",
                isDefault: true,
                stripeConnectAccountId: "acct_123456789",
              },
            ],
          }),
        };
      }

      if (input === "/api/publish/payouts" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            payout: {
              _id: "payout-2",
              amount: 30,
              status: "pending",
              method: "stripe",
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    render(<PayoutManager />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/publish/payouts", {
        credentials: "include",
      }),
    );

    expect(await screen.findByText("Payout History")).toBeInTheDocument();
    expect(screen.getByText(/Connected: acct_123456/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Request Payout"));
    fireEvent.click(screen.getByText("Request $30.00 Payout"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/publish/payouts",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        }),
      ),
    );
  });
});
