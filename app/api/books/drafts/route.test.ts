import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockCreateBookDraft,
  mockEnsureProjectLinkedBookDraft,
  mockListBookDraftsForUser,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockCreateBookDraft: vi.fn(),
  mockEnsureProjectLinkedBookDraft: vi.fn(),
  mockListBookDraftsForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/http", () => ({
  readJsonBody: (request: NextRequest) => request.json(),
  handleBookRouteError: (error: unknown, fallbackMessage: string) =>
    Response.json(
      {
        error: "INTERNAL_ERROR",
        message: fallbackMessage,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    ),
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  createBookDraft: mockCreateBookDraft,
  ensureProjectLinkedBookDraft: mockEnsureProjectLinkedBookDraft,
  listBookDraftsForUser: mockListBookDraftsForUser,
}));

import { GET, POST } from "./route";

describe("books drafts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated GET requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("UNAUTHORIZED");
  });

  it("lists drafts for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListBookDraftsForUser.mockResolvedValue([{ _id: "book-1" }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListBookDraftsForUser).toHaveBeenCalledWith("user-1");
    expect(data.books).toEqual([{ _id: "book-1" }]);
  });

  it("creates a standalone draft when no project id is supplied", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockCreateBookDraft.mockResolvedValue({ _id: "book-1" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/books/drafts", {
        method: "POST",
        body: JSON.stringify({
          title: "Standalone Draft",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateBookDraft).toHaveBeenCalledWith({
      userId: "user-1",
      title: "Standalone Draft",
      legacyProjectId: null,
    });
    expect(mockEnsureProjectLinkedBookDraft).not.toHaveBeenCalled();
    expect(data.book).toEqual({ _id: "book-1" });
  });

  it("reuses or creates a project-linked draft when a project id is supplied", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockEnsureProjectLinkedBookDraft.mockResolvedValue({ _id: "book-2" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/books/drafts", {
        method: "POST",
        body: JSON.stringify({
          title: "Linked Draft",
          projectId: " project-1 ",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockEnsureProjectLinkedBookDraft).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      fallbackTitle: "Linked Draft",
    });
    expect(mockCreateBookDraft).not.toHaveBeenCalled();
    expect(data.book).toEqual({ _id: "book-2" });
  });
});
