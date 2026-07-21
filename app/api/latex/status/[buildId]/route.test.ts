import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCheckRateLimit,
  mockRateLimitResponse,
  mockGetBuildWithPersistenceFallback,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockRateLimitResponse: vi.fn(),
  mockGetBuildWithPersistenceFallback: vi.fn(),
}));

vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  rateLimitResponse: mockRateLimitResponse,
}));

vi.mock("@/lib/writing-studio/buildStore", () => ({
  getBuildWithPersistenceFallback: mockGetBuildWithPersistenceFallback,
}));

import { GET } from "./route";

describe("latex status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: Date.now() + 60_000,
    });
  });

  it("returns the rate-limit response when blocked", async () => {
    const blockedResponse = Response.json({ error: "Too many requests" }, { status: 429 });
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    mockRateLimitResponse.mockReturnValue(blockedResponse);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/latex/status/build-1"),
      { params: Promise.resolve({ buildId: "build-1" }) },
    );

    expect(response.status).toBe(429);
    expect(mockRateLimitResponse).toHaveBeenCalled();
  });

  it("returns 404 when the build does not exist", async () => {
    mockGetBuildWithPersistenceFallback.mockResolvedValue(undefined);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/latex/status/build-1"),
      { params: Promise.resolve({ buildId: "build-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Build not found");
  });

  it("returns the build status payload", async () => {
    mockGetBuildWithPersistenceFallback.mockResolvedValue({
      buildId: "build-1",
      status: "completed",
      pdfUrl: "https://cdn.example.com/build-1.pdf",
      updatedAt: "2026-07-18T12:00:00.000Z",
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/latex/status/build-1"),
      { params: Promise.resolve({ buildId: "build-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      buildId: "build-1",
      status: "completed",
      pdfUrl: "https://cdn.example.com/build-1.pdf",
      error: undefined,
      updatedAt: "2026-07-18T12:00:00.000Z",
    });
  });
});
