import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  authenticateTwinRequest,
  requireAnyAuth,
  type TwinAuthResult,
} from "@/lib/twin-api-auth";

async function resolveTwinId(
  auth: TwinAuthResult & { authenticated: true; userId: string },
  convex: ReturnType<typeof createTwinClient>,
): Promise<string | null> {
  if (auth.twinId) {
    return String(auth.twinId);
  }

  const profile = await convex.query(twinApi.twin.getByMaster, {
    masterId: auth.userId,
  });
  if (!profile?._id) {
    return null;
  }

  return String(profile._id);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireAnyAuth(auth)) {
    return NextResponse.json(
      { error: auth.error ?? "Authentication required" },
      { status: 401 },
    );
  }

  if (!auth.ability?.can("publish", "book")) {
    return NextResponse.json(
      { error: "Twin does not have book:publish permission" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
    const convex = createTwinClient(auth.token);
    const twinId = await resolveTwinId(auth, convex);
    if (!twinId) {
      return NextResponse.json({ error: "Twin profile not found" }, { status: 404 });
    }

    const result = await convex.mutation(twinApi.twin.twinAdvanceBookContentState, {
      twinId: twinId as Id<"twins">,
      bookId: bookId as Id<"books">,
      targetState: "published",
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    return NextResponse.json({
      bookId,
      status: "published",
      previousState: result.previousState,
      newState: result.newState,
    });
  } catch (err) {
    console.error("[twin/book/publish/execute POST]", err);
    return NextResponse.json({ error: "Failed to publish book" }, { status: 500 });
  }
}
