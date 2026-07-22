import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDispatch = vi.fn();
const mockState = {
  auth: {
    accessToken: null,
  },
};

vi.mock("next/navigation", () => ({
  useParams: () => ({ bookId: "book-1" }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock("@/components/common/VoteButton", () => ({
  default: () => <div data-testid="vote-button" />,
}));

vi.mock("@/components/credits/SendCreditsButton", () => ({
  default: () => <div data-testid="send-credits-button" />,
}));

vi.mock("@/lib/insforge/client", () => ({
  getInsforgeBrowserClient: () => ({
    storage: {
      from: () => ({
        download: vi.fn(),
      }),
    },
  }),
}));

import BookDetailPage from "./page";
import { setShowLoginModal } from "@/redux/slices/auth";

describe("BookDetailPage", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.includes("/api/books/published/book-1")) {
          return {
            ok: true,
            json: async () => ({
              book: {
                id: "book-1",
                title: "Test Book",
                description: "A book for testing.",
                userId: "user-2",
                coverImageUrl: null,
                tags: [],
                categories: [],
                creditPrice: 0,
              },
            }),
          } as Response;
        }

        if (url.includes("/api/books/book-1/access")) {
          return {
            ok: true,
            json: async () => ({
              hasAccess: false,
              isAuthor: false,
              isFree: true,
            }),
          } as Response;
        }

        throw new Error(`Unhandled fetch: ${url}`);
      }),
    );
  });

  it("prompts login when an unauthenticated user tries to download a free book", async () => {
    render(<BookDetailPage />);

    const button = await screen.findByRole("button", { name: /sign in to download/i });
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledWith(setShowLoginModal(true));
  });

  it("prompts login when an unauthenticated user tries to unlock a paid book", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();

        if (url.includes("/api/books/published/book-1")) {
          return {
            ok: true,
            json: async () => ({
              book: {
                id: "book-1",
                title: "Paid Test Book",
                description: "A paid book for testing.",
                userId: "user-2",
                coverImageUrl: null,
                tags: [],
                categories: [],
                creditPrice: 250,
              },
            }),
          } as Response;
        }

        if (url.includes("/api/books/book-1/access")) {
          return {
            ok: true,
            json: async () => ({
              hasAccess: false,
              isAuthor: false,
              isFree: false,
            }),
          } as Response;
        }

        throw new Error(`Unhandled fetch: ${url}`);
      }),
    );

    render(<BookDetailPage />);

    const button = await screen.findByRole("button", { name: /sign in to unlock/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(mockDispatch).toHaveBeenCalledWith(setShowLoginModal(true));
  });
});
