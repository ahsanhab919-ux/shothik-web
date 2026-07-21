import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

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
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads unread notifications and dismisses one item", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [
            {
              bookId: "book-1",
              bookTitle: "Draft One",
              notification: {
                id: "notif-1",
                type: "approved",
                message: "Your draft was approved.",
                createdAt: Date.now(),
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updatedCount: 1 }),
      });

    render(<NotificationBell />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/books/notifications", {
        credentials: "include",
      }),
    );

    fireEvent.click(screen.getByLabelText("Notifications (1 unread)"));
    expect(await screen.findByText("Your draft was approved.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/books/notifications",
        expect.objectContaining({
          method: "PATCH",
          credentials: "include",
        }),
      ),
    );

    await waitFor(() =>
      expect(screen.queryByText("Your draft was approved.")).not.toBeInTheDocument(),
    );
  });
});
