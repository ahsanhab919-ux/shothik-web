import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePublishingBook } from "./usePublishingBook";

vi.mock("@/lib/insforge/client", () => ({
  getInsforgeBrowserClient: vi.fn(),
}));

function HookHarness({ projectId }) {
  const { ensureBookDraft } = usePublishingBook({
    initialTitle: "Project Draft",
    userId: "user-1",
    projectId,
  });

  return (
    <button type="button" onClick={() => void ensureBookDraft()}>
      create draft
    </button>
  );
}

describe("usePublishingBook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          book: {
            _id: "book-1",
            title: "Project Draft",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          book: {
            _id: "book-1",
            title: "Project Draft",
          },
        }),
      });
  });

  it("includes the project id when bootstrapping a draft", async () => {
    render(<HookHarness projectId="project-1" />);

    fireEvent.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/books/drafts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          title: "Project Draft",
          projectId: "project-1",
        }),
      }),
    );
  });
});
