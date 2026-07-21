import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.PUBLISHDRIVE_ENABLED = "false";
process.env.NEXT_PUBLIC_PUBLISHDRIVE_ENABLED = "false";

const {
  mockGetAuthenticatedUser,
  mockGetBookDraftForUser,
  mockUpsertDistributionRecord,
  mockGetAvailableChannels,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetBookDraftForUser: vi.fn(),
  mockUpsertDistributionRecord: vi.fn(),
  mockGetAvailableChannels: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/books/insforge-book-service", () => ({
  getBookDraftForUser: mockGetBookDraftForUser,
}));

vi.mock("@/lib/books/insforge-publishing-service", () => ({
  createPublishingNotification: vi.fn(),
  getDistributionRecordForUser: vi.fn(),
  upsertDistributionRecord: mockUpsertDistributionRecord,
  updateDistributionStatusByPublishDriveId: vi.fn(),
}));

vi.mock("@/services/publishDriveService", () => ({
  createBookRecord: vi.fn(),
  uploadManuscriptFile: vi.fn(),
  uploadCoverFile: vi.fn(),
  submitToChannels: vi.fn(),
  getAvailableChannels: mockGetAvailableChannels,
}));

import { POST } from "./route";

describe("publish submit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableChannels.mockReturnValue([
      { id: "google_play", name: "Google Play" },
      { id: "amazon_kindle", name: "Amazon Kindle" },
    ]);
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/submit", {
        method: "POST",
        body: JSON.stringify({ bookId: "book-1" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("stores a local pending distribution record when PublishDrive is disabled", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetBookDraftForUser.mockResolvedValue({
      _id: "book-1",
      userId: "user-1",
      title: "My Book",
      description: "x".repeat(60),
      distributionOptIn: true,
      manuscriptKey: "manuscript.epub",
      coverKey: "cover.jpg",
      category: "Fiction",
    });
    mockUpsertDistributionRecord.mockResolvedValue(undefined);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/publish/submit", {
        method: "POST",
        body: JSON.stringify({ bookId: "book-1", selectedChannels: ["google_play"] }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpsertDistributionRecord).toHaveBeenCalledWith({
      bookId: "book-1",
      userId: "user-1",
      jobId: expect.any(String),
      status: "pending",
      channels: [
        {
          channelId: "google_play",
          channelName: "Google Play",
          status: "processing",
          updatedAt: expect.any(Number),
        },
      ],
    });
    expect(data.success).toBe(true);
    expect(data.publishDriveBookId).toBeNull();
  });
});
