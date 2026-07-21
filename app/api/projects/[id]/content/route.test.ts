import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockUpdateProjectContentForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockUpdateProjectContentForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  updateProjectContentForUser: mockUpdateProjectContentForUser,
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

describe("project content route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when saving content without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/content", {
        method: "POST",
        body: JSON.stringify({ content: "draft" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockUpdateProjectContentForUser).not.toHaveBeenCalled();
  });

  it("saves project content for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUpdateProjectContentForUser.mockResolvedValue({
      success: true,
      savedAt: 1721300000000,
      project: { _id: "project-1", content: "updated draft" },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/content", {
        method: "POST",
        body: JSON.stringify({
          content: "updated draft",
          sections: [{ id: "intro" }],
          wordCount: 120,
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateProjectContentForUser).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      content: "updated draft",
      sections: [{ id: "intro" }],
      wordCount: 120,
    });
    expect(data).toEqual({
      success: true,
      savedAt: 1721300000000,
      project: { _id: "project-1", content: "updated draft" },
    });
  });
});
