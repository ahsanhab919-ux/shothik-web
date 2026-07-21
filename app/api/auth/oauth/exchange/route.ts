import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";
import { getSanitizedUpstreamStatus } from "@/lib/auth-compliance";
import { getInsforgePublicConfig } from "@/lib/insforge/config";
import { normalizeInsforgeUser } from "@/lib/insforge/user";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const codeVerifier =
    typeof body?.codeVerifier === "string" ? body.codeVerifier.trim() : "";

  if (!code) {
    return NextResponse.json(
      {
        error: "AUTH_INVALID_REQUEST",
        message: "OAuth code is required.",
      },
      { status: 400 },
    );
  }

  const auth = createAuthActions({
    cookies: await cookies(),
    ...getInsforgePublicConfig(),
  });
  const { data, error } = await (codeVerifier
    ? auth.exchangeOAuthCode(code, codeVerifier)
    : auth.exchangeOAuthCode(code));

  if (error || !data?.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "AUTH_OAUTH_EXCHANGE_FAILED",
        message: error?.message ?? "Unable to complete Google sign-in.",
      },
      { status: getSanitizedUpstreamStatus(error?.statusCode, 401) },
    );
  }

  return NextResponse.json({ user: normalizeInsforgeUser(data.user) });
}
