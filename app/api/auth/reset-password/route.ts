import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_MESSAGES,
  getSanitizedUpstreamStatus,
} from "@/lib/auth-compliance";
import { createInsforgeServerClient } from "@/lib/insforge/server";

const COMMON_PASSWORDS = new Set([
  "password",
  "123456",
  "12345678",
  "admin",
  "welcome",
  "qwerty",
  "letmein",
  "football",
  "iloveyou",
  "abc123",
  "monkey",
  "123123",
  "sunshine",
  "princess",
  "dragon",
]);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const otp =
    typeof body?.code === "string"
      ? body.code.trim()
      : typeof body?.otp === "string"
        ? body.otp.trim()
        : "";
  const newPassword =
    typeof body?.password === "string"
      ? body.password
      : typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

  if (!otp || !newPassword) {
    return NextResponse.json(
      {
        error: "AUTH_INVALID_REQUEST",
        message: "Reset code and new password are required.",
      },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      {
        error: "AUTH_WEAK_PASSWORD",
        message: "Password must be at least 8 characters long.",
      },
      { status: 400 },
    );
  }

  if (COMMON_PASSWORDS.has(newPassword.toLowerCase())) {
    return NextResponse.json(
      {
        error: "AUTH_WEAK_PASSWORD",
        message: "This password is too common. Please choose a stronger one.",
      },
      { status: 400 },
    );
  }

  const insforge = await createInsforgeServerClient();
  const { data, error } = await insforge.auth.resetPassword({
    otp,
    newPassword,
  });

  if (error) {
    return NextResponse.json(
      {
        error: "AUTH_RESET_PASSWORD_FAILED",
        message: AUTH_MESSAGES.resetPasswordFailed,
      },
      { status: getSanitizedUpstreamStatus(error.statusCode, 400) },
    );
  }

  return NextResponse.json({
    success: true,
    message: data?.message ?? "Password reset successful.",
  });
}
