import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { setPublishedBookPriceForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await readJsonBody(request)) as { creditPrice?: number };
    const { id } = await context.params;

    const book = await setPublishedBookPriceForUser({
      bookId: id,
      userId: user.id,
      creditPrice: body.creditPrice ?? 0,
    });

    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to update book price.");
  }
}
