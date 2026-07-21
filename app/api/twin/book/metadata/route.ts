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
          operation: "metadata",
          bookId: body.bookId,
          title: body.title,
          subtitle: body.subtitle,
          description: body.description,
          category: body.category,
          language: body.language,
          keywords: body.keywords,
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
        message: "Metadata submission queued for master approval.",
      });
    }
    if (!auth.userId) {
      return NextResponse.json({ error: "Twin owner could not be resolved" }, { status: 401 });
    }

    const execution = await invokeTwinBookWrite({
      tenantId: auth.userId,
      userId: auth.userId,
      bookWrite: {
        operation: "metadata",
        bookId: body.bookId as string,
        title: body.title as string | undefined,
        subtitle: body.subtitle as string | undefined,
        description: body.description as string | undefined,
        category: body.category as string | undefined,
        language: body.language as string | undefined,
        keywords: body.keywords as string[] | undefined,
      },
      confirmationToken: "user_confirmed",
      traceId: `twin-book-write:${String(auth.twinId)}:${String(body.bookId)}:metadata`,
    });

    return NextResponse.json({
      success: true,
      contentState: execution.newState,
      previousState: execution.previousState,
      invocationId: execution.invocationId,
      message: "Book submitted for master review.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit metadata";
    console.error("[twin/book/metadata POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
