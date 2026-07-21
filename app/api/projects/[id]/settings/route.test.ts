import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedUser, mockUpdateProjectSettingsForUser } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockUpdateProjectSettingsForUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/projects/insforge-project-service", () => ({
  updateProjectSettingsForUser: mockUpdateProjectSettingsForUser,
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

describe("project settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when updating settings without an authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/settings", {
        method: "POST",
        body: JSON.stringify({ settings: { citationStyle: "APA" } }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mockUpdateProjectSettingsForUser).not.toHaveBeenCalled();
  });

  it("merges and returns project settings for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUpdateProjectSettingsForUser.mockResolvedValue({
      _id: "project-1",
      settings: { citationStyle: "MLA", tone: "formal" },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/projects/project-1/settings", {
        method: "POST",
        body: JSON.stringify({ settings: { citationStyle: "MLA", tone: "formal" } }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdateProjectSettingsForUser).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      settings: { citationStyle: "MLA", tone: "formal" },
    });
    expect(data).toEqual({
      success: true,
      project: {
        _id: "project-1",
        settings: { citationStyle: "MLA", tone: "formal" },
      },
    });
  });
});
