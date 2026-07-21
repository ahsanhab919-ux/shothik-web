import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_MESSAGES,
  isValidEmailAddress,
  normalizeEmailAddress,
} from "@/lib/auth-compliance";
import { createInsforgeServerClient } from "@/lib/insforge/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimiter";

const RESEND_VERIFICATION_INTERVAL_MS = 60_000;

function getResendVerificationRateLimitKey(request: NextRequest, email: string) {
  const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 16);
  return `${getRateLimitKey(request, "auth:resend-verification")}:email:${emailHash}`;
}

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

  const { allowed, remaining, resetAt } = await checkRateLimit(
    getResendVerificationRateLimitKey(request, email),
    {
      windowMs: RESEND_VERIFICATION_INTERVAL_MS,
      maxRequests: 1,
    },
  );

  if (!allowed) {
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "AUTH_RESEND_VERIFICATION_RATE_LIMITED",
        message: "Please wait before requesting another verification code.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  const insforge = await createInsforgeServerClient();
  await insforge.auth.resendVerificationEmail({ email });

  return NextResponse.json({
    success: true,
    message: AUTH_MESSAGES.resendVerificationIfEligible,
  });
}
