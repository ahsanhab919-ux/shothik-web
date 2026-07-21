import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockListProjectVersionsForUser, mockSaveProjectVersionForUser } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockListProjectVersionsForUser: vi.fn(),
    mockSaveProjectVersionForUser: vi.fn(),
  }));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  listProjectVersionsForUser: mockListProjectVersionsForUser,
  saveProjectVersionForUser: mockSaveProjectVersionForUser,
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

import { GET, POST } from "./route";

describe("project versions routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clamps negative limits to the minimum supported value", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListProjectVersionsForUser.mockResolvedValue([{ _id: "version-1" }]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects/project-1/versions?limit=-10"),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListProjectVersionsForUser).toHaveBeenCalledWith("project-1", "user-1", 1);
    expect(data.versions).toEqual([{ _id: "version-1" }]);
  });

  it("returns 401 when saving a version without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/versions", {
        method: "POST",
        body: JSON.stringify({ content: "draft" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockSaveProjectVersionForUser).not.toHaveBeenCalled();
  });

  it("saves a version for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockSaveProjectVersionForUser.mockResolvedValue({ _id: "version-2" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/versions", {
        method: "POST",
        body: JSON.stringify({
          content: "chapter body",
          sections: [{ heading: "Intro" }],
          label: "Checkpoint",
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockSaveProjectVersionForUser).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      content: "chapter body",
      sections: [{ heading: "Intro" }],
      label: "Checkpoint",
    });
    expect(data.version).toEqual({ _id: "version-2" });
  });
});
