import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { handleBookRouteError, readJsonBody } from "@/lib/books/http";
import {
  savePayoutAccountForUser,
  type PayoutMethod,
} from "@/lib/books/insforge-earnings-service";

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
      method?: PayoutMethod;
      isDefault?: boolean;
      stripeConnectAccountId?: string;
      stripeOnboardingComplete?: boolean;
      payoneerAccountEmail?: string;
      payoneerPayeeId?: string;
      bankDetails?: {
        accountHolder: string;
        bankName: string;
        lastFourDigits: string;
        country: string;
      };
    };

    if (
      body.method !== "stripe" &&
      body.method !== "payoneer" &&
      body.method !== "bank_transfer"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "A supported payout account method is required.",
        },
        { status: 400 },
      );
    }

    const payoutAccount = await savePayoutAccountForUser({
      userId: user.id,
      method: body.method,
      isDefault: body.isDefault,
      stripeConnectAccountId: body.stripeConnectAccountId,
      stripeOnboardingComplete: body.stripeOnboardingComplete,
      payoneerAccountEmail: body.payoneerAccountEmail,
      payoneerPayeeId: body.payoneerPayeeId,
      bankDetails: body.bankDetails,
    });

    return NextResponse.json({ payoutAccount });
  } catch (error) {
    return handleBookRouteError(error, "Failed to save payout account.");
  }
}
