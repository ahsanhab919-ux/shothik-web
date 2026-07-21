import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";

import { twinApi, createTwinClient } from "@/lib/twin-convex";
import {
  authenticateTwinRequest,
  requireAnyAuth,
  type TwinAuthResult,
} from "@/lib/twin-api-auth";

type BookWriteOperation = "start" | "upload" | "metadata";

function isBookWriteOperation(value: unknown): value is BookWriteOperation {
  return value === "start" || value === "upload" || value === "metadata";
}

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

  if (!auth.ability?.can("write", "book")) {
    return NextResponse.json(
      { error: "Twin does not have book:write permission" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {}

  if (!isBookWriteOperation(body.operation)) {
    return NextResponse.json(
      { error: "operation must be start, upload, or metadata" },
      { status: 400 },
    );
  }

  try {
    const convex = createTwinClient(auth.token);
    const twinId = await resolveTwinId(auth, convex);
    if (!twinId) {
      return NextResponse.json({ error: "Twin profile not found" }, { status: 404 });
    }

    if (body.operation === "start") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
      }

      const bookId = await convex.mutation(twinApi.twin.twinStartBook, {
        twinId,
        title,
        ...(typeof body.description === "string"
          ? { description: body.description }
          : {}),
        ...(typeof body.category === "string" ? { category: body.category } : {}),
        ...(typeof body.language === "string" ? { language: body.language } : {}),
        ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
      });

      return NextResponse.json({
        operation: "start",
        bookId,
        status: "created",
        previousState: null,
        newState: "draft",
      });
    }

    const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }

    if (body.operation === "upload") {
      const content = typeof body.content === "string" ? body.content : "";
      if (!content.trim()) {
        return NextResponse.json(
          { error: "content (string) is required" },
          { status: 400 },
        );
      }

      const typedTwinId = twinId as Id<"twins">;
      const typedBookId = bookId as Id<"books">;

      await convex.mutation(twinApi.twin.twinUpdateBookContent, {
        twinId: typedTwinId,
        bookId: typedBookId,
        content,
        ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
      });

      const result = await convex.mutation(twinApi.twin.twinAdvanceBookContentState, {
        twinId: typedTwinId,
        bookId: typedBookId,
        targetState: "agent_generated",
        ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
      });

      await convex.mutation(twinApi.twin.logActivity, {
        twinId: typedTwinId,
        action: "book_content_uploaded",
        targetResource: `book:${bookId}`,
        metadata: { contentLength: String(content.length) },
        ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
      });

      return NextResponse.json({
        operation: "upload",
        bookId,
        status: "state_advanced",
        previousState: result.previousState,
        newState: result.newState,
      });
    }

    const typedTwinId = twinId as Id<"twins">;
    const typedBookId = bookId as Id<"books">;

    await convex.mutation(twinApi.twin.twinUpdateBookMetadata, {
      twinId: typedTwinId,
      bookId: typedBookId,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.subtitle === "string" ? { subtitle: body.subtitle } : {}),
      ...(typeof body.description === "string"
        ? { description: body.description }
        : {}),
      ...(typeof body.category === "string" ? { category: body.category } : {}),
      ...(typeof body.language === "string" ? { language: body.language } : {}),
      ...(Array.isArray(body.keywords)
        ? {
            keywords: body.keywords.filter(
              (keyword): keyword is string => typeof keyword === "string",
            ),
          }
        : {}),
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    const result = await convex.mutation(twinApi.twin.twinAdvanceBookContentState, {
      twinId: typedTwinId,
      bookId: typedBookId,
      targetState: "pending_master_review",
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    await convex.mutation(twinApi.twin.logActivity, {
      twinId: typedTwinId,
      action: "book_metadata_submitted",
      targetResource: `book:${bookId}`,
      metadata: {
        ...(typeof body.title === "string" ? { title: body.title } : {}),
      },
      ...(auth.keyHash ? { keyHash: auth.keyHash } : {}),
    });

    return NextResponse.json({
      operation: "metadata",
      bookId,
      status: "state_advanced",
      previousState: result.previousState,
      newState: result.newState,
    });
  } catch (err) {
    console.error("[twin/book/write/execute POST]", err);
    return NextResponse.json({ error: "Failed to execute book write" }, { status: 500 });
  }
}
