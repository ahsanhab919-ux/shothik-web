import { NextRequest, NextResponse } from "next/server";

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

  if (!auth.ability?.can("post", "forum")) {
    return NextResponse.json(
      { error: "Twin does not have forum:post permission" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  const forumId = typeof body.forumId === "string" ? body.forumId.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!forumId) {
    return NextResponse.json({ error: "forumId is required" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const convex = createTwinClient(auth.token);
    const twinId = await resolveTwinId(auth, convex);
    if (!twinId) {
      return NextResponse.json({ error: "Twin profile not found" }, { status: 404 });
    }

    const postId = await convex.mutation(twinApi.twin.twinCreateForumPost, {
      twinId,
      forumId,
      content,
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    return NextResponse.json({
      postId,
      forumId,
      status: "created",
    });
  } catch (err) {
    console.error("[twin/forum/post/execute POST]", err);
    return NextResponse.json(
      { error: "Failed to create forum post" },
      { status: 500 },
    );
  }
}
