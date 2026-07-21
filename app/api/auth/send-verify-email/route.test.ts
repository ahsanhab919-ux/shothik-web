import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateInsforgeServerClient, mockResendVerificationEmail } = vi.hoisted(() => ({
  mockCreateInsforgeServerClient: vi.fn(),
  mockResendVerificationEmail: vi.fn(),
}));
const { mockCheckRateLimit, mockGetRateLimitKey } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockGetRateLimitKey: vi.fn(),
}));

vi.mock("@/lib/insforge/server", () => ({
  createInsforgeServerClient: mockCreateInsforgeServerClient,
}));

vi.mock("@/lib/rateLimiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  getRateLimitKey: mockGetRateLimitKey,
}));

import { POST } from "./route";

describe("POST /api/auth/send-verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRateLimitKey.mockReturnValue("auth:resend-verification:ip:127.0.0.1");
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    mockCreateInsforgeServerClient.mockResolvedValue({
      auth: {
        resendVerificationEmail: mockResendVerificationEmail,
      },
    });
  });

  it("returns 400 when email is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/send-verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Email is required.",
    });
  });

  it("returns 400 when email format is invalid", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/send-verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Enter a valid email address.",
    });
  });

  it("resends the verification email for the trimmed address and returns a generic success payload", async () => {
    mockResendVerificationEmail.mockResolvedValue({
      data: {
        success: true,
        message: "Verification sent.",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/send-verify-email", {
      method: "POST",
      body: JSON.stringify({ email: " verify@example.com " }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(mockResendVerificationEmail).toHaveBeenCalledWith({
      email: "verify@example.com",
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "If the email is eligible for verification, a code will be sent.",
    });
  });

  it("returns 429 when a resend is attempted before the resend interval resets", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/send-verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "verify@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mockResendVerificationEmail).not.toHaveBeenCalled();
    expect(response.headers.get("Retry-After")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_RESEND_VERIFICATION_RATE_LIMITED",
      message: "Please wait before requesting another verification code.",
    });
  });

  it("returns the same generic success payload when the upstream resend call errors", async () => {
    mockResendVerificationEmail.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_RESEND_VERIFY_EMAIL_FAILED",
        message: "Too many requests.",
        statusCode: 429,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/send-verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "verify@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "If the email is eligible for verification, a code will be sent.",
    });
  });
});
