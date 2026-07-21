import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockRestoreProjectVersionForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockRestoreProjectVersionForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  restoreProjectVersionForUser: mockRestoreProjectVersionForUser,
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

import { POST } from "./route";

describe("restore project version route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/versions/version-1/restore", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "project-1", versionId: "version-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockRestoreProjectVersionForUser).not.toHaveBeenCalled();
  });

  it("restores the requested version for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRestoreProjectVersionForUser.mockResolvedValue({
      _id: "project-1",
      content: "restored content",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/versions/version-1/restore", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "project-1", versionId: "version-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockRestoreProjectVersionForUser).toHaveBeenCalledWith(
      "project-1",
      "version-1",
      "user-1",
    );
    expect(data).toEqual({
      success: true,
      project: {
        _id: "project-1",
        content: "restored content",
      },
    });
  });
});
