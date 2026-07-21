import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCookies, mockVerifyEmail } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockVerifyEmail: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: vi.fn(() => ({
    verifyEmail: mockVerifyEmail,
  })),
}));

import { POST } from "./route";

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_INSFORGE_URL", "https://example.insforge.app");
    vi.stubEnv("NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon-key");
    mockCookies.mockResolvedValue({});
  });

  it("returns 400 when email or verification code is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Email and verification code are required.",
    });
  });

  it("returns 400 when email format is invalid", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "invalid-email", code: "123456" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Enter a valid email address.",
    });
  });

  it("returns 400 when verification code is too short", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", code: "123" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Enter the verification code from your email.",
    });
  });

  it("verifies email using the trimmed email and code fields", async () => {
    mockVerifyEmail.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: " user@example.com ", code: " 123456 " }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockVerifyEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "123456",
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "Email verified successfully.",
    });
  });

  it("returns a generic upstream verify-email error", async () => {
    mockVerifyEmail.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_VERIFY_EMAIL_FAILED",
        message: "Verification code expired.",
        statusCode: 410,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_VERIFY_EMAIL_FAILED",
      message: "Unable to verify email with the provided code.",
    });
  });

  it("keeps reused verification failures generic", async () => {
    mockVerifyEmail.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_VERIFY_EMAIL_FAILED",
        message: "Verification code already used.",
        statusCode: 409,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_VERIFY_EMAIL_FAILED",
      message: "Unable to verify email with the provided code.",
    });
  });
});
