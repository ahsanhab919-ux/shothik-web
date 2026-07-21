import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import logger from "@/lib/logger";
import {
  executeStripePayoutForUser,
  StripePayoutExecutionError,
} from "@/lib/books/stripe-payout-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId, amount, currency = "usd", stripeAccountId, periodStart, periodEnd } = body;

    const result = await executeStripePayoutForUser({
      authenticatedUserId: user.id,
      requestedUserId: userId,
      amountInCents: amount,
      currency,
      stripeAccountId,
      periodStart,
      periodEnd,
      idempotencyKey: req.headers.get("idempotency-key"),
    });

    return NextResponse.json(result.transfer, {
      headers: result.replayed
        ? { "Idempotency-Replay": "true" }
        : undefined,
    });
  } catch (error) {
    if (error instanceof StripePayoutExecutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    logger.error("Payout error:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 }
    );
  }
}
