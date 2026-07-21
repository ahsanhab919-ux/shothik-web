import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { requireAuthorizedBookAdmin } from "@/lib/authz/admin";
import { listBooksForAdmin } from "@/lib/books/insforge-book-service";
import { handleBookRouteError, parseInteger } from "@/lib/books/http";

type AdminBookStatus = NonNullable<Parameters<typeof listBooksForAdmin>[0]["status"]>;

const ALLOWED_STATUSES = new Set([
  "draft",
  "submitted",
  "approved",
  "published",
  "rejected",
  "unpublished",
]);

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    await requireAuthorizedBookAdmin(user);

    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status");
    const status =
      requestedStatus && ALLOWED_STATUSES.has(requestedStatus)
        ? (requestedStatus as AdminBookStatus)
        : null;
    const limit = parseInteger(url.searchParams.get("limit"), 100);

    const books = await listBooksForAdmin({
      status,
      limit,
    });

    return NextResponse.json({ books });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load admin book queue.");
  }
}
