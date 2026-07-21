import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { submitBookDraftForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const book = await submitBookDraftForUser({
      bookId: id,
      userId: user.id,
    });

    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to submit book draft.");
  }
}
