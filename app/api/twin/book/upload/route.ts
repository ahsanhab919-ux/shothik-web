import { NextRequest, NextResponse } from "next/server";
import { authenticateTwinRequest, requireTwinKey, needsApproval } from "@/lib/twin-api-auth";
import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  invokeTwinBookWrite,
  TWIN_BOOK_WRITE_TOOL_NAME,
} from "@/lib/twin/mcp-book-write";

export async function POST(req: NextRequest) {
  const auth = await authenticateTwinRequest(req);
  if (!requireTwinKey(auth)) {
    return NextResponse.json({ error: "Twin API key required" }, { status: 401 });
  }

  if (!auth.ability?.can("write", "book")) {
    return NextResponse.json({ error: "Twin does not have book:write permission" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "content (string) is required" }, { status: 400 });
  }
  if (!body.bookId || typeof body.bookId !== "string") {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  try {
    const twin = auth.twin;
    const convex = createTwinClient();

    if (needsApproval(twin, "book:write") && twin.masterId) {
      const approvalId = await convex.mutation(twinApi.twin.createPendingApproval, {
        twinId: auth.twinId,
        masterId: twin.masterId,
        action: "book:write",
        payload: {
          operation: "upload",
          bookId: body.bookId,
          content: body.content,
          contentLength: (body.content as string).length,
          governedInvocation: {
            toolName: TWIN_BOOK_WRITE_TOOL_NAME,
            confirmationRequired: true,
          },
        },
        keyHash: auth.keyHash,
      });
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId,
        message: "Book content upload queued for master approval.",
      });
    }
    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinBookWrite({
      tenantId: auth.userId,
      userId: auth.userId,
      bookWrite: {
        operation: "upload",
        bookId: body.bookId as string,
        content: body.content as string,
      },
      confirmationToken: "user_confirmed",
      traceId: `twin-book-write:${String(auth.twinId)}:${String(body.bookId)}:upload`,
    });

    return NextResponse.json({
      success: true,
      contentState: execution.newState,
      previousState: execution.previousState,
      invocationId: execution.invocationId,
      message: "Content uploaded. Submit metadata for review: POST /api/twin/book/metadata",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload content";
    console.error("[twin/book/upload POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
