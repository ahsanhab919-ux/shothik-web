import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockGetDistributionRecordForUser,
  mockUpdateDistributionStatusByPublishDriveId,
  mockGetDistributionStatus,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetDistributionRecordForUser: vi.fn(),
  mockUpdateDistributionStatusByPublishDriveId: vi.fn(),
  mockGetDistributionStatus: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/insforge-publishing-service", () => ({
  getDistributionRecordForUser: mockGetDistributionRecordForUser,
  updateDistributionStatusByPublishDriveId:
    mockUpdateDistributionStatusByPublishDriveId,
}));

vi.mock("@/services/publishDriveService", () => ({
  getDistributionStatus: mockGetDistributionStatus,
}));

import { GET } from "./route";

describe("publish status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/publish/status?bookId=book-1"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when no distribution record exists", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetDistributionRecordForUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/publish/status?bookId=book-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("No distribution record found");
  });

  it("returns the local record when no PublishDrive id exists", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetDistributionRecordForUser.mockResolvedValue({
      status: "pending",
      channels: [{ channelId: "google_play", status: "processing" }],
      updatedAt: 100,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/publish/status?bookId=book-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.source).toBe("local");
    expect(data.status).toBe("pending");
  });

  it("persists changed PublishDrive statuses before responding", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetDistributionRecordForUser.mockResolvedValue({
      status: "processing",
      publishDriveBookId: "pd-1",
      channels: [
        {
          channelId: "google_play",
          channelName: "Google Play",
          status: "processing",
          updatedAt: 100,
        },
      ],
      updatedAt: 100,
    });
    mockGetDistributionStatus.mockResolvedValue({
      success: true,
      channels: [{ id: "google_play", status: "live", url: "https://store.test" }],
    });
    mockUpdateDistributionStatusByPublishDriveId.mockResolvedValue({
      channels: [
        {
          channelId: "google_play",
          channelName: "Google Play",
          status: "live",
          url: "https://store.test",
          updatedAt: 200,
        },
      ],
      updatedAt: 200,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/publish/status?bookId=book-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateDistributionStatusByPublishDriveId).toHaveBeenCalledWith({
      publishDriveBookId: "pd-1",
      status: "completed",
      channels: [
        {
          channelId: "google_play",
          channelName: "Google Play",
          status: "live",
          url: "https://store.test",
          updatedAt: expect.any(Number),
        },
      ],
    });
    expect(data.status).toBe("completed");
    expect(data.source).toBe("publishdrive");
  });
});
