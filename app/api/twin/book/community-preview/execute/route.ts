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

  if (!auth.ability?.can("preview", "community")) {
    return NextResponse.json(
      { error: "Twin does not have community:preview permission" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
  const forumId = typeof body.forumId === "string" ? body.forumId.trim() : "";

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  if (!forumId) {
    return NextResponse.json(
      { error: "forumId is required (target forum for the community preview)" },
      { status: 400 },
    );
  }

  try {
    const convex = createTwinClient(auth.token);
    const twinId = await resolveTwinId(auth, convex);
    if (!twinId) {
      return NextResponse.json({ error: "Twin profile not found" }, { status: 404 });
    }

    const result = await convex.mutation(twinApi.twin.twinPostCommunityPreview, {
      twinId: twinId as Id<"twins">,
      bookId: bookId as Id<"books">,
      forumId: forumId as Id<"forums">,
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    return NextResponse.json({
      postId: String(result.postId),
      bookId,
      forumId,
      status: "community_preview_posted",
      previousState: result.previousState,
      newState: result.newState,
    });
  } catch (err) {
    console.error("[twin/book/community-preview/execute POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to post community preview" },
      { status: 400 },
    );
  }
}
