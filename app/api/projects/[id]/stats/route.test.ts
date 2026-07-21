import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockGetProjectStatsForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetProjectStatsForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  getProjectStatsForUser: mockGetProjectStatsForUser,
  InsforgeProjectServiceError: class extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    apiRequest: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET } from "./route";

describe("project stats route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when loading stats without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects/project-1/stats"),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockGetProjectStatsForUser).not.toHaveBeenCalled();
  });

  it("returns computed project stats for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetProjectStatsForUser.mockResolvedValue({
      totalVersions: 3,
      wordsWritten: 2400,
      targetWords: 8000,
      progress: 30,
      velocity: 600,
      estimatedDays: 10,
      lastEdited: 1721300000000,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects/project-1/stats"),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetProjectStatsForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(data).toEqual({
      totalVersions: 3,
      wordsWritten: 2400,
      targetWords: 8000,
      progress: 30,
      velocity: 600,
      estimatedDays: 10,
      lastEdited: 1721300000000,
    });
  });
});
