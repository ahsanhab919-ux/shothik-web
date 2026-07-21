import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";
import {
  AUTH_MESSAGES,
  getSanitizedUpstreamStatus,
  isValidEmailAddress,
  normalizeEmailAddress,
} from "@/lib/auth-compliance";
import { getInsforgePublicConfig } from "@/lib/insforge/config";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = normalizeEmailAddress(body?.email);
  const otp =
    typeof body?.code === "string"
      ? body.code.trim()
      : typeof body?.otp === "string"
        ? body.otp.trim()
        : "";

  if (!email || !otp) {
    return NextResponse.json(
      {
        error: "AUTH_INVALID_REQUEST",
        message: "Email and verification code are required.",
      },
      { status: 400 },
    );
  }

  if (!isValidEmailAddress(email) || otp.length < 6) {
    return NextResponse.json(
      {
        error: "AUTH_INVALID_REQUEST",
        message: !isValidEmailAddress(email) ? AUTH_MESSAGES.invalidEmail : "Enter the verification code from your email.",
      },
      { status: 400 },
    );
  }

  const auth = createAuthActions({
    cookies: await cookies(),
    ...getInsforgePublicConfig(),
  });
  const { error } = await auth.verifyEmail({ email, otp });

  if (error) {
    return NextResponse.json(
      {
        error: "AUTH_VERIFY_EMAIL_FAILED",
        message: AUTH_MESSAGES.verifyEmailFailed,
      },
      { status: getSanitizedUpstreamStatus(error.statusCode, 400) },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully.",
  });
}
