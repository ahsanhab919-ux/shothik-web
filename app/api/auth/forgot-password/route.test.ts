import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateInsforgeServerClient, mockSendResetPasswordEmail } = vi.hoisted(() => ({
  mockCreateInsforgeServerClient: vi.fn(),
  mockSendResetPasswordEmail: vi.fn(),
}));

vi.mock("@/lib/insforge/server", () => ({
  createInsforgeServerClient: mockCreateInsforgeServerClient,
}));

import { POST } from "./route";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInsforgeServerClient.mockResolvedValue({
      auth: {
        sendResetPasswordEmail: mockSendResetPasswordEmail,
      },
    });
  });

  it("returns 400 when email is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
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
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
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

  it("sends the reset email and returns a generic success payload", async () => {
    mockSendResetPasswordEmail.mockResolvedValue({
      data: {
        success: true,
        message: "Reset sent.",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: " user@example.com " }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "If an account exists for that email, reset instructions will be sent.",
    });
  });

  it("returns the same generic success payload when the upstream call errors", async () => {
    mockSendResetPasswordEmail.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_FORGOT_PASSWORD_FAILED",
        message: "Unable to send email.",
        statusCode: 429,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "If an account exists for that email, reset instructions will be sent.",
    });
  });
});
