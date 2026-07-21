import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getBookAccessForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await context.params;

    if (!user) {
      return NextResponse.json({
        hasAccess: false,
        isAuthor: false,
        isFree: false,
      });
    }

    const access = await getBookAccessForUser(id, user.id);
    return NextResponse.json(access);
  } catch (error) {
    return handleBookRouteError(error, "Failed to resolve book access.");
  }
}
