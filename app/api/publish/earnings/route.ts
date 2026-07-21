import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { handleBookRouteError } from "@/lib/books/http";
import { getEarningsSummaryForUser } from "@/lib/books/insforge-earnings-service";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const summary = await getEarningsSummaryForUser(user.id);
    return NextResponse.json({ summary });
  } catch (error) {
    return handleBookRouteError(error, "Failed to load earnings summary.");
  }
}
