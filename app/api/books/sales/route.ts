import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { listBookSalesForUser } from "@/lib/books/insforge-book-service";
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

    const sales = await listBookSalesForUser(user.id);
    return NextResponse.json(sales);
  } catch (error) {
    return handleBookRouteError(error, "Failed to load book sales.");
  }
}
