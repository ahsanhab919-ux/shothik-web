import type { NextRequest } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AUTH_MESSAGES = {
  invalidEmail: "Enter a valid email address.",
  invalidCredentials: "Invalid email or password.",
  signUpFailed: "Unable to create an account with the provided details.",
  forgotPasswordIfExists: "If an account exists for that email, reset instructions will be sent.",
  resendVerificationIfEligible: "If the email is eligible for verification, a code will be sent.",
  verifyEmailFailed: "Unable to verify email with the provided code.",
  resetPasswordFailed: "Unable to reset password with the provided code.",
} as const;

export function normalizeEmailAddress(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmailAddress(email: string) {
  return EMAIL_PATTERN.test(email);
}

export function getAppOrigin(request?: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  if (request) {
    return request.nextUrl.origin;
  }

  return "http://localhost:3000";
}

export function resolveSafeAuthRedirectTarget(request: NextRequest, redirectTo: unknown) {
  const origin = getAppOrigin(request);

  if (typeof redirectTo !== "string" || redirectTo.trim().length === 0) {
    return `${origin}/auth/login`;
  }

  const trimmed = redirectTo.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://")) {
    return new URL(trimmed, origin).toString();
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== origin) {
      return `${origin}/auth/login`;
    }

    return parsed.toString();
  } catch {
    return `${origin}/auth/login`;
  }
}

export function getSanitizedUpstreamStatus(statusCode: number | undefined, fallbackStatus: number) {
  if (typeof statusCode !== "number") return fallbackStatus;
  if (statusCode >= 500) return 500;
  return fallbackStatus;
}
