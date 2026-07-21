import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getCreditsBalanceForUser } from "@/lib/books/insforge-book-service";
import { handleBookRouteError } from "@/lib/books/http";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        totalReceived: 0,
      });
    }

    const balance = await getCreditsBalanceForUser(user.id);
    return NextResponse.json(balance);
  } catch (error) {
    return handleBookRouteError(error, "Failed to load credit balance.");
  }
}
