import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireTwinKey, needsApproval } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  invokeTwinCommunityPreview,
  TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
} from "@/lib/twin/mcp-community-preview";

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  if (!auth.ability?.can("preview", "community")) {
    return NextResponse.json({ error: "Twin does not have community:preview permission" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.bookId || typeof body.bookId !== "string") {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }
  if (!body.forumId || typeof body.forumId !== "string") {
    return NextResponse.json({ error: "forumId is required (target forum for the community preview)" }, { status: 400 });
  }

  try {
    const twin = auth.twin;
    const convex = createTwinClient();

    if (needsApproval(twin, "community:preview") && twin.masterId) {
      const approvalId = await convex.mutation(twinApi.twin.createPendingApproval, {
        twinId: auth.twinId,
        masterId: twin.masterId,
        action: "community:preview",
        payload: {
          bookId: body.bookId,
          forumId: body.forumId,
          governedInvocation: {
            toolName: TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
            confirmationRequired: true,
          },
        },
        keyHash: auth.keyHash,
      });
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId,
        message: "Community preview queued for master approval.",
      });
    }
    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinCommunityPreview({
      tenantId: auth.userId,
      userId: auth.userId,
      bookId: body.bookId,
      forumId: body.forumId,
      confirmationToken: "user_confirmed",
      traceId: `twin-community-preview:${String(auth.twinId)}:${String(body.bookId)}:${String(body.forumId)}`,
    });

    return NextResponse.json({
      success: true,
      postId: execution.postId,
      contentState: execution.newState,
      previousState: execution.previousState,
      invocationId: execution.invocationId,
      message: "Community preview posted to forum successfully.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to post community preview";
    console.error("[twin/book/community-preview POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
