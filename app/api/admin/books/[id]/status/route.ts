import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { requireAuthorizedBookAdmin } from "@/lib/authz/admin";
import {
  moderateBookForAdmin,
  type BookModerationAction,
} from "@/lib/books/insforge-book-service";
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

    await requireAuthorizedBookAdmin(user);

    const body = (await readJsonBody(request)) as BookModerationAction;
    const { id } = await context.params;

    const book = await moderateBookForAdmin({
      bookId: id,
      adminUserId: user.id,
      adminLabel: user.name || user.email,
      action: body,
    });

    return NextResponse.json({ book });
  } catch (error) {
    return handleBookRouteError(error, "Failed to update moderation status.");
  }
}
