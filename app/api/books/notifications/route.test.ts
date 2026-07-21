import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockListUnreadPublishingNotificationsForUser,
  mockMarkPublishingNotificationsReadForUser,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockListUnreadPublishingNotificationsForUser: vi.fn(),
  mockMarkPublishingNotificationsReadForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/http", () => ({
  readJsonBody: (request) => request.json(),
  handleBookRouteError: (error, fallbackMessage) =>
    Response.json(
      {
        error: "INTERNAL_ERROR",
        message: fallbackMessage,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    ),
}));

vi.mock("@/lib/books/insforge-publishing-service", () => ({
  listUnreadPublishingNotificationsForUser:
    mockListUnreadPublishingNotificationsForUser,
  markPublishingNotificationsReadForUser:
    mockMarkPublishingNotificationsReadForUser,
}));

import { GET, PATCH } from "./route";

describe("books notifications route", () => {
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

  it("returns unread notifications for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListUnreadPublishingNotificationsForUser.mockResolvedValue([
      { notification: { id: "notif-1" } },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListUnreadPublishingNotificationsForUser).toHaveBeenCalledWith(
      "user-1",
    );
    expect(data.notifications).toEqual([{ notification: { id: "notif-1" } }]);
  });

  it("rejects invalid PATCH payloads before calling the service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/books/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notificationIds: [] }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("INVALID_REQUEST");
    expect(mockMarkPublishingNotificationsReadForUser).not.toHaveBeenCalled();
  });

  it("marks notifications read for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockMarkPublishingNotificationsReadForUser.mockResolvedValue({
      updatedCount: 2,
    });

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/books/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          bookId: "book-1",
          notificationIds: ["notif-1", "notif-2"],
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockMarkPublishingNotificationsReadForUser).toHaveBeenCalledWith({
      userId: "user-1",
      bookId: "book-1",
      notificationIds: ["notif-1", "notif-2"],
    });
    expect(data.updatedCount).toBe(2);
  });
});
