import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateInsforgeServerClient, mockResetPassword } = vi.hoisted(() => ({
  mockCreateInsforgeServerClient: vi.fn(),
  mockResetPassword: vi.fn(),
}));

vi.mock("@/lib/insforge/server", () => ({
  createInsforgeServerClient: mockCreateInsforgeServerClient,
}));

import { POST } from "./route";

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInsforgeServerClient.mockResolvedValue({
      auth: {
        resetPassword: mockResetPassword,
      },
    });
  });

  it("returns 400 when otp or password is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_INVALID_REQUEST",
      message: "Reset code and new password are required.",
    });
  });

  it("returns 400 for too-short passwords", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ code: "123456", password: "short" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_WEAK_PASSWORD",
      message: "Password must be at least 8 characters long.",
    });
  });

  it("returns 400 for common passwords", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ otp: "654321", newPassword: "password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_WEAK_PASSWORD",
      message: "This password is too common. Please choose a stronger one.",
    });
  });

  it("resets the password with the accepted payload shape", async () => {
    mockResetPassword.mockResolvedValue({
      data: {
        message: "Password updated.",
      },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ code: " 654321 ", password: "StrongPass!234" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockResetPassword).toHaveBeenCalledWith({
      otp: "654321",
      newPassword: "StrongPass!234",
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: "Password updated.",
    });
  });

  it("returns a generic upstream password reset error", async () => {
    mockResetPassword.mockResolvedValue({
      data: null,
      error: {
        error: "AUTH_RESET_PASSWORD_FAILED",
        message: "Reset code expired.",
        statusCode: 400,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ otp: "654321", newPassword: "StrongPass!234" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "AUTH_RESET_PASSWORD_FAILED",
      message: "Unable to reset password with the provided code.",
    });
  });
});
