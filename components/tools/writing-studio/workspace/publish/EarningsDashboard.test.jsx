import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EarningsDashboard } from "./EarningsDashboard";

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        user: {
          _id: "user-1",
        },
      },
    }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe("EarningsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the earnings summary and exposes payout CTA when eligible", async () => {
    const onRequestPayout = vi.fn();

    global.fetch = vi.fn().mockImplementation(async (input) => {
      if (input === "/api/publish/earnings") {
        return {
          ok: true,
          json: async () => ({
            summary: {
              totalEarnings: 120.5,
              totalUnitsSold: 22,
              lifetimeRevenue: 160.75,
              availableBalance: 55.25,
              totalPaidOut: 40,
              pendingPayouts: 10,
              publishedBooksCount: 2,
              monthlyBreakdown: [{ period: "2026-07", royalties: 30, units: 4 }],
              perBookEarnings: [
                {
                  bookId: "book-1",
                  title: "Book One",
                  units: 22,
                  revenue: 160.75,
                  royalties: 120.5,
                },
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    render(<EarningsDashboard onRequestPayout={onRequestPayout} />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/publish/earnings", {
        credentials: "include",
      }),
    );

    expect(await screen.findByText("Total Royalties Earned")).toBeInTheDocument();
    expect(screen.getByText("Book One")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Request Payout"));

    expect(onRequestPayout).toHaveBeenCalledTimes(1);
  });
});
