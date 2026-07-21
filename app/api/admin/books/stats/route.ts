import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { requireAuthorizedBookAdmin } from "@/lib/authz/admin";
import { getBookModerationStats } from "@/lib/books/insforge-book-service";
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

    await requireAuthorizedBookAdmin(user);
    const stats = await getBookModerationStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load admin moderation stats.");
  }
}
