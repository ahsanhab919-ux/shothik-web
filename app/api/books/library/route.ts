import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { listPurchasedLibraryForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const purchases = await listPurchasedLibraryForUser(user.id);
    return NextResponse.json({ purchases });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load purchased library.");
  }
}
