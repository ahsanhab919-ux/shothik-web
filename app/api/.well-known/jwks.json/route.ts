import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "Convex JWKS route retired",
    detail: "This endpoint is no longer used after the InsForge migration.",
  }, {
    status: 410,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
