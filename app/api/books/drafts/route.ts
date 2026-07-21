import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import {
  createBookDraft,
  ensureProjectLinkedBookDraft,
  listBookDraftsForUser,
} from "@/lib/books/insforge-book-service";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const books = await listBookDraftsForUser(user.id);
    return NextResponse.json({ books });
  } catch (error) {
    return handleBookRouteError(error, "Failed to list book drafts.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await readJsonBody(request)) as {
      title?: string;
      projectId?: string | null;
    };

    const normalizedProjectId =
      typeof body.projectId === "string" && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : null;

    const book = normalizedProjectId
      ? await ensureProjectLinkedBookDraft({
          userId: user.id,
          projectId: normalizedProjectId,
          fallbackTitle: body.title,
        })
      : await createBookDraft({
          userId: user.id,
          title: body.title,
          legacyProjectId: body.projectId ?? null,
        });

    return NextResponse.json({ book }, { status: 201 });
  } catch (error) {
    return handleBookRouteError(error, "Failed to create book draft.");
  }
}
