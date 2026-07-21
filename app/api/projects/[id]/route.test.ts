import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAuthenticatedUser,
  mockDeleteProjectForUser,
  mockGetProjectForUser,
  mockUpdateProjectForUser,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockDeleteProjectForUser: vi.fn(),
  mockGetProjectForUser: vi.fn(),
  mockUpdateProjectForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  deleteProjectForUser: mockDeleteProjectForUser,
  getProjectForUser: mockGetProjectForUser,
  updateProjectForUser: mockUpdateProjectForUser,
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

import { DELETE, GET, PATCH } from "./route";

describe("project item routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when loading a project without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects/project-1"),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockGetProjectForUser).not.toHaveBeenCalled();
  });

  it("loads the requested project for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetProjectForUser.mockResolvedValue({ _id: "project-1", title: "Draft" });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/projects/project-1"),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(data.project).toEqual({ _id: "project-1", title: "Draft" });
  });

  it("updates a project for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUpdateProjectForUser.mockResolvedValue({ _id: "project-1", title: "Updated Title" });

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/projects/project-1", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Updated Title",
          progress: 42,
          researchNotes: { themes: ["identity"] },
          agentChapters: [{ id: "ch-1", title: "Opening" }],
        }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateProjectForUser).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      updates: {
        title: "Updated Title",
        progress: 42,
        researchNotes: { themes: ["identity"] },
        agentChapters: [{ id: "ch-1", title: "Opening" }],
      },
    });
    expect(data.project).toEqual({ _id: "project-1", title: "Updated Title" });
  });

  it("deletes a project for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockDeleteProjectForUser.mockResolvedValue({ success: true });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/projects/project-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockDeleteProjectForUser).toHaveBeenCalledWith("project-1", "user-1");
    expect(data).toEqual({ success: true });
  });
});
