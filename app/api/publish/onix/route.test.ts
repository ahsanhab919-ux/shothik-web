import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockGetBookDraftForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetBookDraftForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  getBookDraftForUser: mockGetBookDraftForUser,
}));

import { GET, POST } from "./route";

describe("publish onix route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated POST requests", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/onix", {
        method: "POST",
        body: JSON.stringify({ bookId: "book-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("generates ONIX from the InsForge-backed draft service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetBookDraftForUser.mockResolvedValue({
      _id: "book-1",
      title: "The Midnight Protocol",
      subtitle: "A Story",
      description: "A".repeat(60),
      language: "en",
      listPrice: "9.99",
      currency: "USD",
      category: "fiction_thriller",
      keywords: ["thriller", "mystery", "future"],
      agreementName: "Jane Doe",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/onix", {
        method: "POST",
        body: JSON.stringify({ bookId: "book-1" }),
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(mockGetBookDraftForUser).toHaveBeenCalledWith("book-1", "user-1");
    expect(body).toContain("<ONIXMessage");
    expect(body).toContain("The Midnight Protocol");
  });

  it("blocks GET when the book is not approved or published", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetBookDraftForUser.mockResolvedValue({
      _id: "book-1",
      status: "draft",
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/publish/onix?bookId=book-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Book is not published");
  });
});
