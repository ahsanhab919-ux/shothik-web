import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_MESSAGES,
  isValidEmailAddress,
  normalizeEmailAddress,
} from "@/lib/auth-compliance";
import { createInsforgeServerClient } from "@/lib/insforge/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = normalizeEmailAddress(body?.email);

  if (!email) {
    return NextResponse.json(
      { error: "AUTH_INVALID_REQUEST", message: "Email is required." },
      { status: 400 },
    );
  }

  if (!isValidEmailAddress(email)) {
    return NextResponse.json(
      { error: "AUTH_INVALID_REQUEST", message: AUTH_MESSAGES.invalidEmail },
      { status: 400 },
    );
  }

  const insforge = await createInsforgeServerClient();
  await insforge.auth.sendResetPasswordEmail({ email });

  return NextResponse.json({
    success: true,
    message: AUTH_MESSAGES.forgotPasswordIfExists,
  });
}
