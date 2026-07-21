import { NextRequest, NextResponse } from "next/server";
import { mintConvexAccessToken } from "@/lib/convex-auth";
import { getAuthenticatedRequestUser } from "@/lib/insforge/request";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedRequestUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const token = await mintConvexAccessToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({
    token,
    issuer: user.authProvider,
    expiresInSeconds: 3600,
  });
}
