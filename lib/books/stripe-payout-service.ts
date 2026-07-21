import Stripe from "stripe";
import logger from "@/lib/logger";
import {
  checkIdempotency,
  markIdempotencyPending,
  storeIdempotency,
} from "@/lib/security/idempotency";
import {
  getPreferredStripePayoutAccountForUser,
  recordCompletedStripeTransfer,
} from "@/lib/books/insforge-earnings-service";

type ExecuteStripePayoutArgs = {
  authenticatedUserId: string;
  requestedUserId: string;
  amountInCents: number;
  currency?: string;
  stripeAccountId?: string | null;
  periodStart?: string;
  periodEnd?: string;
  idempotencyKey?: string | null;
};

export class StripePayoutExecutionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripePayoutExecutionError(
      "Stripe payouts are not configured in this environment.",
      503,
    );
  }

  return new Stripe(secretKey);
}

export async function executeStripePayoutForUser(
  args: ExecuteStripePayoutArgs,
) {
  if (!args.requestedUserId || typeof args.requestedUserId !== "string") {
    throw new StripePayoutExecutionError("userId is required", 400);
  }

  if (args.requestedUserId !== args.authenticatedUserId) {
    logger.warn("Payout userId mismatch", {
      tokenUserId: args.authenticatedUserId,
      bodyUserId: args.requestedUserId,
    });
    throw new StripePayoutExecutionError(
      "Forbidden: userId does not match authenticated user",
      403,
    );
  }

  if (
    !Number.isFinite(args.amountInCents) ||
    args.amountInCents < 2500
  ) {
    throw new StripePayoutExecutionError("Minimum payout is $25", 400);
  }

  if (args.idempotencyKey) {
    const existing = await checkIdempotency(
      args.idempotencyKey,
      args.authenticatedUserId,
      "payout",
    );
    if (existing?.status === "completed") {
      const replayedResponse =
        existing.response && typeof existing.response === "object"
          ? (existing.response as Record<string, unknown>)
          : null;

      return {
        transfer: existing.response,
        payout: replayedResponse?.payout ?? null,
        replayed: true,
      };
    }
    if (existing?.status === "pending") {
      throw new StripePayoutExecutionError("Payout already in progress", 409);
    }
    await markIdempotencyPending(
      args.idempotencyKey,
      args.authenticatedUserId,
      "payout",
    );
  }

  let resolvedStripeAccountId =
    typeof args.stripeAccountId === "string" ? args.stripeAccountId : null;

  if (!resolvedStripeAccountId) {
    try {
      const preferred = await getPreferredStripePayoutAccountForUser(
        args.authenticatedUserId,
      );
      resolvedStripeAccountId = preferred?.stripeConnectAccountId ?? null;
    } catch (error) {
      logger.warn("Failed to resolve Stripe Connect account from InsForge", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!resolvedStripeAccountId) {
    throw new StripePayoutExecutionError(
      "Stripe account not connected. Complete onboarding first.",
      400,
    );
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(resolvedStripeAccountId);
  if ((account as any).deleted) {
    throw new StripePayoutExecutionError("Stripe account not found", 404);
  }
  if (
    (account as any).metadata?.userId &&
    (account as any).metadata.userId !== args.authenticatedUserId
  ) {
    throw new StripePayoutExecutionError(
      "Forbidden: Stripe account does not belong to authenticated user",
      403,
    );
  }
  if (!(account as any).payouts_enabled) {
    throw new StripePayoutExecutionError(
      "Payouts not enabled for this account",
      400,
    );
  }

  const transfer = (await stripe.transfers.create({
    amount: args.amountInCents,
    currency: (args.currency ?? "usd").toLowerCase(),
    destination: resolvedStripeAccountId,
    description: "Shothik royalty payout",
    metadata: { userId: args.authenticatedUserId, platform: "shothik" },
  })) as unknown as Stripe.Transfer;

  const estimatedArrival = Date.now() + 2 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const computedPeriodStart =
    typeof args.periodStart === "string" && args.periodStart.length > 0
      ? args.periodStart
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const computedPeriodEnd =
    typeof args.periodEnd === "string" && args.periodEnd.length > 0
      ? args.periodEnd
      : new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

  const payout = await recordCompletedStripeTransfer({
    userId: args.authenticatedUserId,
    stripeTransferId: transfer.id,
    stripeAccountId: resolvedStripeAccountId,
    amountInCents: transfer.amount,
    currency: transfer.currency,
    estimatedArrival,
    periodStart: computedPeriodStart,
    periodEnd: computedPeriodEnd,
  });

  const responseBody = {
    transferId: transfer.id,
    status: (transfer as any).status,
    amount: transfer.amount,
    currency: transfer.currency,
    estimatedArrival,
    payout,
  };

  if (args.idempotencyKey) {
    await storeIdempotency(
      args.idempotencyKey,
      args.authenticatedUserId,
      "payout",
      responseBody,
    );
  }

  return {
    transfer: responseBody,
    payout,
    replayed: false,
  };
}
