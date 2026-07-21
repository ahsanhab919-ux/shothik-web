import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCookies, mockExchangeOAuthCode } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockExchangeOAuthCode: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: vi.fn(() => ({
    exchangeOAuthCode: mockExchangeOAuthCode,
  })),
}));

import { POST } from "./route";

describe("POST /api/auth/oauth/exchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_INSFORGE_URL", "https://example.insforge.app");
    vi.stubEnv("NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon-key");
    mockCookies.mockResolvedValue({});
  });

  it("returns 400 when the OAuth code is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "OAuth code is required.",
    });
  });

  it("returns the normalized user when the exchange succeeds", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      data: {
        user: {
          id: "if-user-1",
          email: "user@example.com",
          userMetadata: {
            full_name: "Ahsan",
          },
        },
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code: "oauth-code-1" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockExchangeOAuthCode).toHaveBeenCalledWith("oauth-code-1");
    expect(data.user).toMatchObject({
      id: "if-user-1",
      _id: "if-user-1",
      authProvider: "insforge",
    });
  });

  it("passes through the PKCE code verifier when provided", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      data: {
        user: {
          id: "if-user-2",
          email: "user2@example.com",
          userMetadata: {},
        },
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code: "oauth-code-3", codeVerifier: "verifier-1" }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockExchangeOAuthCode).toHaveBeenCalledWith("oauth-code-3", "verifier-1");
  });

  it("surfaces a sanitized upstream exchange failure", async () => {
    mockExchangeOAuthCode.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_UNAUTHORIZED",
        message: "OAuth exchange failed",
        statusCode: 401,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({ code: "oauth-code-2" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_UNAUTHORIZED",
      message: "OAuth exchange failed",
    });
  });
});
