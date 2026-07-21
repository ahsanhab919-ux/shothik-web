import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockRequireAuthorizedBookAdmin, mockListBooksForAdmin } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockRequireAuthorizedBookAdmin: vi.fn(),
    mockListBooksForAdmin: vi.fn(),
  }));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/authz/admin", () => ({
  requireAuthorizedBookAdmin: mockRequireAuthorizedBookAdmin,
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  listBooksForAdmin: mockListBooksForAdmin,
}));

import { GET } from "./route";

describe("GET /api/admin/books", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/books"),
    );

    expect(response.status).toBe(401);
    expect(mockRequireAuthorizedBookAdmin).not.toHaveBeenCalled();
    expect(mockListBooksForAdmin).not.toHaveBeenCalled();
  });

  it("returns the filtered admin book queue", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "admin-1" });
    mockRequireAuthorizedBookAdmin.mockResolvedValue(undefined);
    mockListBooksForAdmin.mockResolvedValue([{ _id: "book-1" }]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/books?status=approved&limit=20"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListBooksForAdmin).toHaveBeenCalledWith({
      status: "approved",
      limit: 20,
    });
    expect(data).toEqual({
      books: [{ _id: "book-1" }],
    });
  });
});
