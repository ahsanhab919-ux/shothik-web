import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockJwtVerify } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
}));

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}));

vi.mock("jose", async () => {
  const actual = await vi.importActual<typeof import("jose")>("jose");
  return {
    ...actual,
    createRemoteJWKSet: vi.fn(() => "mock-jwks"),
    jwtVerify: mockJwtVerify,
  };
});

vi.mock("@insforge/sdk", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getCurrentUser: mockGetCurrentUser,
    },
  })),
}));

import {
  evaluatePreviewAccess,
  extractPreviewAccessClaims,
  isPreviewAuthEnabled,
  isPreviewBypassPath,
  verifyPreviewAccessToken,
} from "@/lib/security/preview-access";

describe("preview access helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          metadata: {},
          profile: {},
        },
      },
      error: null,
    });
  });

  function env(overrides: Record<string, string>) {
    return overrides as unknown as NodeJS.ProcessEnv;
  }

  it("enables preview auth automatically on Vercel preview deployments", () => {
    expect(isPreviewAuthEnabled(env({ VERCEL_ENV: "preview" }))).toBe(true);
    expect(
      isPreviewAuthEnabled(env({
        VERCEL_ENV: "preview",
        PREVIEW_AUTH_ENABLED: "false",
      })),
    ).toBe(false);
  });

  it("knows which preview paths must stay reachable without an app session", () => {
    expect(isPreviewBypassPath("/")).toBe(true);
    expect(isPreviewBypassPath("/agents")).toBe(true);
    expect(isPreviewBypassPath("/marketplace")).toBe(true);
    expect(isPreviewBypassPath("/community")).toBe(true);
    expect(isPreviewBypassPath("/community/forum-1")).toBe(true);
    expect(isPreviewBypassPath("/books/book-1")).toBe(true);
    expect(isPreviewBypassPath("/paraphrase")).toBe(true);
    expect(isPreviewBypassPath("/api/books/published")).toBe(true);
    expect(isPreviewBypassPath("/api/books/published/book-1")).toBe(true);
    expect(isPreviewBypassPath("/api/books/book-1/access")).toBe(true);
    expect(isPreviewBypassPath("/auth/login")).toBe(true);
    expect(isPreviewBypassPath("/api/auth/sign-in")).toBe(true);
    expect(isPreviewBypassPath("/api/health")).toBe(true);
    expect(isPreviewBypassPath("/agents/chat")).toBe(false);
  });

  it("extracts email, role, and scopes from common token claim shapes", () => {
    const claims = extractPreviewAccessClaims({
      sub: "user-1",
      email: "user@example.com",
      role: "member",
      scope: "preview:access chat:write",
      app_metadata: {
        permissions: ["admin:preview"],
      },
    });

    expect(claims).toEqual({
      subject: "user-1",
      email: "user@example.com",
      role: "member",
      scopes: expect.arrayContaining([
        "preview:access",
        "chat:write",
        "admin:preview",
      ]),
    });
  });

  it("denies preview access when a required scope is missing", () => {
    const result = evaluatePreviewAccess(
      {
        subject: "user-1",
        email: "user@example.com",
        role: "member",
        scopes: ["chat:write"],
      },
      env({
        PREVIEW_ACCESS_REQUIRED_SCOPES: "preview:access",
      }),
    );

    expect(result).toEqual({
      allowed: false,
      reason: "missing_required_scope",
    });
  });

  it("supports email and role allowlists when configured", () => {
    const allowed = evaluatePreviewAccess(
      {
        subject: "user-1",
        email: "staff@example.com",
        role: "staff",
        scopes: [],
      },
      env({
        PREVIEW_ACCESS_ALLOWED_EMAILS: "staff@example.com",
        PREVIEW_ACCESS_ALLOWED_ROLES: "staff,admin",
      }),
    );

    const denied = evaluatePreviewAccess(
      {
        subject: "user-2",
        email: "writer@example.com",
        role: "member",
        scopes: [],
      },
      env({
        PREVIEW_ACCESS_ALLOWED_EMAILS: "staff@example.com",
        PREVIEW_ACCESS_ALLOWED_ROLES: "staff,admin",
      }),
    );

    expect(allowed).toEqual({ allowed: true });
    expect(denied).toEqual({
      allowed: false,
      reason: "email_not_allowlisted",
    });
  });

  it("verifies RS256 preview tokens against the InsForge JWKS", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-1",
        email: "user@example.com",
        role: "member",
        scope: "preview:access",
      },
    });

    const result = await verifyPreviewAccessToken("valid-token", env({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon-key",
    }));

    expect(result).toEqual({
      valid: true,
      claims: {
        subject: "user-1",
        email: "user@example.com",
        role: "member",
        scopes: ["preview:access"],
      },
    });
  });

  it("hydrates preview scopes from the current InsForge user metadata", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-1",
        email: "user@example.com",
        role: "authenticated",
      },
    });
    mockGetCurrentUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
          metadata: {
            scopes: ["preview:access"],
          },
          profile: {},
        },
      },
      error: null,
    });

    const result = await verifyPreviewAccessToken("valid-token", env({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon-key",
    }));

    expect(result).toEqual({
      valid: true,
      claims: {
        subject: "user-1",
        email: "user@example.com",
        role: "authenticated",
        scopes: ["preview:access"],
      },
    });
  });

  it("returns a structured error when token verification fails", async () => {
    mockJwtVerify.mockRejectedValue(new Error("jwt expired"));

    const result = await verifyPreviewAccessToken("expired-token", env({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
    }));

    expect(result).toEqual({
      valid: false,
      error: "jwt expired",
    });
  });

  it("rejects tokens when the InsForge session can no longer be hydrated", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-1",
        email: "user@example.com",
        role: "authenticated",
      },
    });
    mockGetCurrentUser.mockResolvedValue({
      data: null,
      error: {
        message: "Session expired",
      },
    });

    const result = await verifyPreviewAccessToken("stale-token", env({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon-key",
    }));

    expect(result).toEqual({
      valid: false,
      error: "Session expired",
    });
  });
});
