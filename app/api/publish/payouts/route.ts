import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";
import {
  createPayoutRequestForUser,
  listPayoutDataForUser,
  type PayoutMethod,
} from "@/lib/books/insforge-earnings-service";
import { executeStripePayoutForUser } from "@/lib/books/stripe-payout-service";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const data = await listPayoutDataForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return handleBookRouteError(error, "Failed to load payout data.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required." },
        { status: 401 },
      );
    }

    const body = (await readJsonBody(request)) as {
      amount?: number;
      currency?: string;
      method?: PayoutMethod;
      periodStart?: string;
      periodEnd?: string;
    };

    if (
      typeof body.amount !== "number" ||
      (body.method !== "stripe" &&
        body.method !== "payoneer" &&
        body.method !== "bank_transfer") ||
      typeof body.periodStart !== "string" ||
      typeof body.periodEnd !== "string"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "A complete payout request payload is required.",
        },
        { status: 400 },
      );
    }

    if (body.method === "stripe") {
      const { payout, transfer } = await executeStripePayoutForUser({
        authenticatedUserId: user.id,
        requestedUserId: user.id,
        amountInCents: Math.round(body.amount * 100),
        currency: body.currency ?? "USD",
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        idempotencyKey: request.headers.get("idempotency-key"),
      });

      return NextResponse.json({
        payout,
        transfer,
      });
    }

    const payout = await createPayoutRequestForUser({
      userId: user.id,
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });

    return NextResponse.json({ payout });
  } catch (error) {
    return handleBookRouteError(error, "Failed to create payout request.");
  }
}
