import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireTwinKey, needsApproval } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  invokeTwinBookPublish,
  TWIN_BOOK_PUBLISH_TOOL_NAME,
} from "@/lib/twin/mcp-book-publish";

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  if (!auth.ability?.can("publish", "book")) {
    return NextResponse.json({ error: "Twin does not have book:publish permission" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.bookId || typeof body.bookId !== "string") {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
    const twin = auth.twin;
    const convex = createTwinClient();

    if (needsApproval(twin, "book:publish") && twin.masterId) {
      const approvalId = await convex.mutation(twinApi.twin.createPendingApproval, {
        twinId: auth.twinId,
        masterId: twin.masterId,
        action: "book:publish",
        payload: {
          bookId: body.bookId,
          governedInvocation: {
            toolName: TWIN_BOOK_PUBLISH_TOOL_NAME,
            confirmationRequired: true,
          },
        },
        keyHash: auth.keyHash,
      });
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId,
        message: "Book publishing queued for master approval.",
      });
    }

    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinBookPublish({
      tenantId: auth.userId,
      userId: auth.userId,
      bookId: body.bookId,
      confirmationToken: "user_confirmed",
      traceId: `twin-book-publish:${String(auth.twinId)}:${String(body.bookId)}`,
    });

    return NextResponse.json({
      success: true,
      requiresApproval: false,
      bookId: execution.bookId,
      status: execution.status,
      previousState: execution.previousState,
      newState: execution.newState,
      invocationId: execution.invocationId,
      message: "Book published successfully.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish book";
    console.error("[twin/book/publish POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
