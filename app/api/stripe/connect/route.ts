import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-auth";
import logger from "@/lib/logger";
import { syncStripeAccountStatusForUser } from "@/lib/books/insforge-earnings-service";
import {
  getStripe,
  isStripeConfigurationError,
} from "@/lib/stripe/config";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { userId, email, returnUrl } = await req.json();

    if ((!email && !user.email) || (userId && userId !== user.id)) {
      return NextResponse.json(
        { error: userId && userId !== user.id ? "Forbidden: userId does not match authenticated user" : "userId and email are required" },
        { status: userId && userId !== user.id ? 403 : 400 }
      );
    }

    const resolvedBaseUrl = typeof returnUrl === "string" && returnUrl.length > 0
      ? returnUrl
      : process.env.NEXT_PUBLIC_APP_URL;

    const account = await stripe.accounts.create({
      type: "express",
      email: email || user.email,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { userId: user.id, platform: "shothik" },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${resolvedBaseUrl}/dashboard/payouts/onboarding?refresh=true`,
      return_url: `${resolvedBaseUrl}/dashboard/payouts/onboarding?success=true`,
      type: "account_onboarding",
    });

    try {
      await syncStripeAccountStatusForUser({
        userId: user.id,
        accountId: account.id,
        payoutsEnabled: false,
        isDefault: true,
      });
    } catch (e) {
      logger.warn("Failed to persist Stripe Connect account to InsForge", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }
    logger.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const stripe = getStripe();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(accountId);
    if ((account as any).deleted) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if ((account as any).metadata?.userId && (account as any).metadata.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await syncStripeAccountStatusForUser({
        userId: user.id,
        accountId: account.id,
        payoutsEnabled: Boolean((account as any).payouts_enabled),
        isDefault: true,
      });
    } catch (e) {
      logger.warn("Failed to sync Stripe Connect status to InsForge", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      accountId: account.id,
      payoutsEnabled: (account as any).payouts_enabled,
      chargesEnabled: (account as any).charges_enabled,
      requirements: (account as any).requirements?.currently_due || [],
    });
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }
    logger.error("Stripe account status error:", error);
    return NextResponse.json(
      { error: "Failed to get account status" },
      { status: 500 }
    );
  }
}
