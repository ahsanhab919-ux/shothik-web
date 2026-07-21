import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetAuthenticatedRequestUser, mockMintConvexAccessToken } = vi.hoisted(() => ({
  mockGetAuthenticatedRequestUser: vi.fn(),
  mockMintConvexAccessToken: vi.fn(),
}));

vi.mock("@/lib/insforge/request", () => ({
  getAuthenticatedRequestUser: mockGetAuthenticatedRequestUser,
}));

vi.mock("@/lib/convex-auth", () => ({
  mintConvexAccessToken: mockMintConvexAccessToken,
}));

import { POST } from "./route";

describe("convex-token route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated user is present", async () => {
    mockGetAuthenticatedRequestUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("returns a Convex token for the current InsForge-authenticated user", async () => {
    mockGetAuthenticatedRequestUser.mockResolvedValue({
      id: "user_123",
      email: "writer@example.com",
      name: "Writer",
      authProvider: "insforge",
    });
    mockMintConvexAccessToken.mockResolvedValue("convex.jwt.token");

    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/convex-token", {
        method: "POST",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockMintConvexAccessToken).toHaveBeenCalledWith({
      id: "user_123",
      email: "writer@example.com",
      name: "Writer",
    });
    expect(data).toMatchObject({
      token: "convex.jwt.token",
      issuer: "insforge",
      expiresInSeconds: 3600,
    });
  });
});
