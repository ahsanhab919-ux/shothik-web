import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireTwinKey, needsApproval } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  invokeTwinForumPost,
  TWIN_FORUM_POST_TOOL_NAME,
} from "@/lib/twin/mcp-forum-post";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ forumId: string }> }
) {
  const { forumId } = await params;
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  if (!auth.ability?.can("post", "forum")) {
    return NextResponse.json({ error: "Twin does not have forum:post permission" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    const twin = auth.twin;
    const convex = createTwinClient();

    if (needsApproval(twin, "forum:post") && twin.masterId) {
      const approvalId = await convex.mutation(twinApi.twin.createPendingApproval, {
        twinId: auth.twinId,
        masterId: twin.masterId,
        action: "forum:post",
        payload: {
          forumId,
          content: body.content,
          governedInvocation: {
            toolName: TWIN_FORUM_POST_TOOL_NAME,
            confirmationRequired: true,
          },
        },
        keyHash: auth.keyHash,
      });
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId,
        message: "Forum post queued for master approval.",
      });
    }

    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinForumPost({
      tenantId: auth.userId,
      userId: auth.userId,
      post: {
        forumId,
        content: body.content as string,
      },
      confirmationToken: "user_confirmed",
      traceId: `twin-forum-post:${String(auth.twinId)}:${forumId}`,
    });

    return NextResponse.json({
      success: true,
      requiresApproval: false,
      postId: execution.postId,
      forumId: execution.forumId,
      status: execution.status,
      invocationId: execution.invocationId,
      message: "Forum post created.",
    });
  } catch (err) {
    console.error("[twin/forum/[forumId]/post POST]", err);
    return NextResponse.json({ error: "Failed to create forum post" }, { status: 500 });
  }
}
