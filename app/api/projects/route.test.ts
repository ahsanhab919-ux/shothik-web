import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockListProjectsForUser, mockCreateProjectForUser } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockListProjectsForUser: vi.fn(),
    mockCreateProjectForUser: vi.fn(),
  }));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  createProjectForUser: mockCreateProjectForUser,
  listProjectsForUser: mockListProjectsForUser,
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

describe("projects collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when listing projects without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost:3000/api/projects"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: "UNAUTHORIZED",
      message: "Authentication required.",
    });
    expect(mockListProjectsForUser).not.toHaveBeenCalled();
  });

  it("passes the validated type filter to the project service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListProjectsForUser.mockResolvedValue([{ _id: "project-1" }]);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects?type=research"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockListProjectsForUser).toHaveBeenCalledWith("user-1", "research");
    expect(data.projects).toEqual([{ _id: "project-1" }]);
  });

  it("surfaces a backend-unavailable response when the projects schema is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockListProjectsForUser.mockRejectedValue({
      code: "42P01",
      message: 'relation "public.projects" does not exist',
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/projects"));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      error: "PROJECT_BACKEND_UNAVAILABLE",
      message:
        "Project storage is temporarily unavailable. Verify DATABASE_URL matches the active InsForge project schema.",
    });
  });

  it("rejects invalid create payloads before calling the service", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({ title: "", type: "book" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("INVALID_REQUEST");
    expect(mockCreateProjectForUser).not.toHaveBeenCalled();
  });

  it("creates a project for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockCreateProjectForUser.mockResolvedValue({ _id: "project-2", title: "Story" });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: "Story",
          type: "book",
          description: "Long form draft",
          sections: [],
          settings: { tone: "warm" },
          researchNotes: { themes: ["identity"] },
          agentChapters: [{ id: "ch-1", title: "Opening" }],
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateProjectForUser).toHaveBeenCalledWith({
      userId: "user-1",
      title: "Story",
      type: "book",
      description: "Long form draft",
      sections: [],
      settings: { tone: "warm" },
      researchNotes: { themes: ["identity"] },
      agentChapters: [{ id: "ch-1", title: "Opening" }],
    });
    expect(data.project).toEqual({ _id: "project-2", title: "Story" });
  });
});
