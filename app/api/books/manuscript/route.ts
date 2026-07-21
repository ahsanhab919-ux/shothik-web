import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getManuscriptAssetForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const bookId = req.nextUrl.searchParams.get("bookId");
    if (!bookId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Missing bookId." },
        { status: 400 },
      );
    }

    const result = await getManuscriptAssetForUser({
      bookId,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleBookRouteError(error, "Failed to prepare manuscript download.");
  }
}
