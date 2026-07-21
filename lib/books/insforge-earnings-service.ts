import type { PoolClient, QueryResultRow } from "pg";
import { insforgeQuery, withInsforgeTransaction } from "@/lib/insforge-db";
import { InsforgeBookServiceError } from "@/lib/books/insforge-book-service";

type PublishedBookRow = {
  id: string;
  title: string;
};

type BookSalesAggregateRow = {
  book_id: string;
  title: string | null;
  units: string | number;
  revenue: string | number;
  royalties: string | number;
};

type MonthlySalesAggregateRow = {
  period: string;
  revenue: string | number;
  royalties: string | number;
  units: string | number;
};

type PayoutAccountRow = {
  id: string;
  auth_user_id: string;
  method: "stripe" | "payoneer" | "bank_transfer";
  is_default: boolean;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  payoneer_account_email: string | null;
  payoneer_payee_id: string | null;
  bank_details: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PayoutRow = {
  id: string;
  auth_user_id: string;
  amount: string | number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  method: "stripe" | "payoneer" | "bank_transfer";
  stripe_transfer_id: string | null;
  stripe_account_id: string | null;
  estimated_arrival: Date | string | null;
  processed_at: Date | string | null;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PayoutMethod = "stripe" | "payoneer" | "bank_transfer";

export type PayoutAccountInput = {
  userId: string;
  method: PayoutMethod;
  isDefault?: boolean;
  stripeConnectAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
  payoneerAccountEmail?: string | null;
  payoneerPayeeId?: string | null;
  bankDetails?: {
    accountHolder: string;
    bankName: string;
    lastFourDigits: string;
    country: string;
  } | null;
};

export type PayoutRequestInput = {
  userId: string;
  amount: number;
  currency?: string;
  method: PayoutMethod;
  periodStart: string;
  periodEnd: string;
  metadata?: Record<string, unknown>;
};

function toMillis(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeRequiredText(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", `${fieldLabel} is required.`);
  }
  return normalized;
}

function normalizePayoutMethod(method: string): PayoutMethod {
  if (method === "stripe" || method === "payoneer" || method === "bank_transfer") {
    return method;
  }
  throw new InsforgeBookServiceError("INVALID_REQUEST", "Unsupported payout method.");
}

function normalizeCurrency(input?: string) {
  const normalized = (input ?? "USD").trim().toUpperCase();
  if (!normalized || normalized.length > 8) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Currency is invalid.");
  }
  return normalized;
}

function normalizePeriod(input: string, fieldLabel: string) {
  const normalized = input.trim();
  if (!normalized) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", `${fieldLabel} is required.`);
  }
  return normalized;
}

function normalizePayoutAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 25) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "Minimum payout amount is $25.00.",
    );
  }
  return amount.toFixed(2);
}

function serializePayoutAccount(row: PayoutAccountRow) {
  return {
    _id: row.id,
    userId: row.auth_user_id,
    method: row.method,
    isDefault: row.is_default,
    stripeConnectAccountId: row.stripe_connect_account_id ?? undefined,
    stripeOnboardingComplete: row.stripe_onboarding_complete,
    payoneerAccountEmail: row.payoneer_account_email ?? undefined,
    payoneerPayeeId: row.payoneer_payee_id ?? undefined,
    bankDetails:
      row.bank_details && Object.keys(row.bank_details).length > 0
        ? row.bank_details
        : undefined,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function serializePayout(row: PayoutRow) {
  return {
    _id: row.id,
    userId: row.auth_user_id,
    amount: toNumber(row.amount),
    currency: row.currency,
    status: row.status,
    method: row.method,
    stripeTransferId: row.stripe_transfer_id ?? undefined,
    stripeAccountId: row.stripe_account_id ?? undefined,
    estimatedArrival: toMillis(row.estimated_arrival),
    processedAt: toMillis(row.processed_at),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    metadata: row.metadata ?? {},
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

async function runQuery<T extends QueryResultRow>(
  client: PoolClient | null,
  text: string,
  params: unknown[] = [],
) {
  if (client) {
    return client.query<T>(text, params);
  }
  return insforgeQuery<T>(text, params);
}

async function listPublishedBooksForUser(userId: string) {
  const result = await insforgeQuery<PublishedBookRow>(
    `
      select
        id,
        title
      from public.books
      where auth_user_id = $1::uuid
        and status = 'published'
      order by published_at desc nulls last, created_at desc
    `,
    [userId],
  );

  return result.rows;
}

async function getPayoutAccountRowByMethod(
  client: PoolClient | null,
  userId: string,
  method: PayoutMethod,
) {
  const result = await runQuery<PayoutAccountRow>(
    client,
    `
      select
        id,
        auth_user_id,
        method,
        is_default,
        stripe_connect_account_id,
        stripe_onboarding_complete,
        payoneer_account_email,
        payoneer_payee_id,
        bank_details,
        created_at,
        updated_at
      from public.author_payout_accounts
      where auth_user_id = $1::uuid
        and method = $2
      limit 1
    `,
    [userId, method],
  );

  return result.rows[0] ?? null;
}

export async function getEarningsSummaryForUser(userId: string) {
  const [publishedBooks, perBookResult, monthlyResult, payoutResult] = await Promise.all([
    listPublishedBooksForUser(userId),
    insforgeQuery<BookSalesAggregateRow>(
      `
        select
          s.book_id,
          max(b.title) as title,
          coalesce(sum(s.units_sold), 0) as units,
          coalesce(sum(s.net_revenue), 0) as revenue,
          coalesce(sum(s.royalty_amount), 0) as royalties
        from public.book_sales_records s
        left join public.books b
          on b.id = s.book_id
        where s.auth_user_id = $1::uuid
        group by s.book_id
      `,
      [userId],
    ),
    insforgeQuery<MonthlySalesAggregateRow>(
      `
        select
          s.period,
          coalesce(sum(s.net_revenue), 0) as revenue,
          coalesce(sum(s.royalty_amount), 0) as royalties,
          coalesce(sum(s.units_sold), 0) as units
        from public.book_sales_records s
        where s.auth_user_id = $1::uuid
        group by s.period
        order by s.period asc
      `,
      [userId],
    ),
    insforgeQuery<PayoutRow>(
      `
        select
          id,
          auth_user_id,
          amount,
          currency,
          status,
          method,
          stripe_transfer_id,
          stripe_account_id,
          estimated_arrival,
          processed_at,
          period_start,
          period_end,
          metadata,
          created_at,
          updated_at
        from public.author_payouts
        where auth_user_id = $1::uuid
      `,
      [userId],
    ),
  ]);

  const perBookMap = new Map(
    perBookResult.rows.map((row) => [
      row.book_id,
      {
        bookId: row.book_id,
        title: row.title ?? "Untitled Book",
        units: Number.parseInt(String(row.units), 10) || 0,
        revenue: toNumber(row.revenue),
        royalties: toNumber(row.royalties),
      },
    ]),
  );

  for (const book of publishedBooks) {
    if (!perBookMap.has(book.id)) {
      perBookMap.set(book.id, {
        bookId: book.id,
        title: book.title,
        units: 0,
        revenue: 0,
        royalties: 0,
      });
    }
  }

  const perBookEarnings = Array.from(perBookMap.values()).sort((a, b) =>
    b.royalties === a.royalties ? a.title.localeCompare(b.title) : b.royalties - a.royalties,
  );

  const monthlyBreakdown = monthlyResult.rows.slice(-12).map((row) => ({
    period: row.period,
    revenue: toNumber(row.revenue),
    royalties: toNumber(row.royalties),
    units: Number.parseInt(String(row.units), 10) || 0,
  }));

  const totalRevenue = perBookEarnings.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnitsSold = perBookEarnings.reduce((sum, row) => sum + row.units, 0);
  const totalEarnings = perBookEarnings.reduce((sum, row) => sum + row.royalties, 0);

  const totalPaidOut = payoutResult.rows
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  const pendingPayouts = payoutResult.rows
    .filter((row) => row.status === "pending" || row.status === "processing")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  return {
    totalEarnings,
    totalUnitsSold,
    lifetimeRevenue: totalRevenue,
    availableBalance: Math.max(0, totalEarnings - totalPaidOut - pendingPayouts),
    totalPaidOut,
    pendingPayouts,
    publishedBooksCount: publishedBooks.length,
    monthlyBreakdown,
    perBookEarnings,
    totalRevenue,
    totalSales: totalUnitsSold,
    totalRoyalties: totalEarnings,
    paidBalance: totalPaidOut,
    pendingBalance: Math.max(0, totalEarnings - totalPaidOut),
    publishedBooks: publishedBooks.length,
  };
}

export async function listPayoutAccountsForUser(userId: string) {
  const result = await insforgeQuery<PayoutAccountRow>(
    `
      select
        id,
        auth_user_id,
        method,
        is_default,
        stripe_connect_account_id,
        stripe_onboarding_complete,
        payoneer_account_email,
        payoneer_payee_id,
        bank_details,
        created_at,
        updated_at
      from public.author_payout_accounts
      where auth_user_id = $1::uuid
      order by is_default desc, updated_at desc
    `,
    [userId],
  );

  return result.rows.map(serializePayoutAccount);
}

export async function savePayoutAccountForUser(args: PayoutAccountInput) {
  const method = normalizePayoutMethod(args.method);

  return withInsforgeTransaction(async (client) => {
    if (args.isDefault) {
      await client.query(
        `
          update public.author_payout_accounts
          set
            is_default = false,
            updated_at = now()
          where auth_user_id = $1::uuid
            and method <> $2
        `,
        [args.userId, method],
      );
    }

    const result = await client.query<PayoutAccountRow>(
      `
        insert into public.author_payout_accounts (
          auth_user_id,
          method,
          is_default,
          stripe_connect_account_id,
          stripe_onboarding_complete,
          payoneer_account_email,
          payoneer_payee_id,
          bank_details
        )
        values ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb)
        on conflict (auth_user_id, method)
        do update set
          is_default = excluded.is_default,
          stripe_connect_account_id = coalesce(excluded.stripe_connect_account_id, public.author_payout_accounts.stripe_connect_account_id),
          stripe_onboarding_complete = excluded.stripe_onboarding_complete,
          payoneer_account_email = excluded.payoneer_account_email,
          payoneer_payee_id = excluded.payoneer_payee_id,
          bank_details = excluded.bank_details,
          updated_at = now()
        returning
          id,
          auth_user_id,
          method,
          is_default,
          stripe_connect_account_id,
          stripe_onboarding_complete,
          payoneer_account_email,
          payoneer_payee_id,
          bank_details,
          created_at,
          updated_at
      `,
      [
        args.userId,
        method,
        Boolean(args.isDefault),
        args.stripeConnectAccountId ?? null,
        Boolean(args.stripeOnboardingComplete),
        args.payoneerAccountEmail?.trim() || null,
        args.payoneerPayeeId?.trim() || null,
        JSON.stringify(args.bankDetails ?? {}),
      ],
    );

    return serializePayoutAccount(result.rows[0]);
  });
}

export async function getPreferredStripePayoutAccountForUser(userId: string) {
  const result = await insforgeQuery<PayoutAccountRow>(
    `
      select
        id,
        auth_user_id,
        method,
        is_default,
        stripe_connect_account_id,
        stripe_onboarding_complete,
        payoneer_account_email,
        payoneer_payee_id,
        bank_details,
        created_at,
        updated_at
      from public.author_payout_accounts
      where auth_user_id = $1::uuid
        and method = 'stripe'
        and stripe_connect_account_id is not null
      order by is_default desc, updated_at desc
      limit 1
    `,
    [userId],
  );

  const row = result.rows[0] ?? null;
  return row ? serializePayoutAccount(row) : null;
}

export async function listPayoutHistoryForUser(userId: string) {
  const result = await insforgeQuery<PayoutRow>(
    `
      select
        id,
        auth_user_id,
        amount,
        currency,
        status,
        method,
        stripe_transfer_id,
        stripe_account_id,
        estimated_arrival,
        processed_at,
        period_start,
        period_end,
        metadata,
        created_at,
        updated_at
      from public.author_payouts
      where auth_user_id = $1::uuid
      order by created_at desc
    `,
    [userId],
  );

  return result.rows.map(serializePayout);
}

export async function createPayoutRequestForUser(args: PayoutRequestInput) {
  const result = await insforgeQuery<PayoutRow>(
    `
      insert into public.author_payouts (
        auth_user_id,
        amount,
        currency,
        status,
        method,
        period_start,
        period_end,
        metadata
      )
      values ($1::uuid, $2::numeric, $3, 'pending', $4, $5, $6, $7::jsonb)
      returning
        id,
        auth_user_id,
        amount,
        currency,
        status,
        method,
        stripe_transfer_id,
        stripe_account_id,
        estimated_arrival,
        processed_at,
        period_start,
        period_end,
        metadata,
        created_at,
        updated_at
    `,
    [
      args.userId,
      normalizePayoutAmount(args.amount),
      normalizeCurrency(args.currency),
      normalizePayoutMethod(args.method),
      normalizePeriod(args.periodStart, "periodStart"),
      normalizePeriod(args.periodEnd, "periodEnd"),
      JSON.stringify(args.metadata ?? {}),
    ],
  );

  return serializePayout(result.rows[0]);
}

export async function recordCompletedStripeTransfer(args: {
  userId: string;
  stripeTransferId: string;
  stripeAccountId: string;
  amountInCents: number;
  currency: string;
  estimatedArrival?: number | null;
  periodStart: string;
  periodEnd: string;
}) {
  if (!Number.isFinite(args.amountInCents) || args.amountInCents < 2500) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "Minimum payout amount is $25.00.",
    );
  }

  return withInsforgeTransaction(async (client) => {
    const existing = await runQuery<PayoutRow>(
      client,
      `
        select
          id,
          auth_user_id,
          amount,
          currency,
          status,
          method,
          stripe_transfer_id,
          stripe_account_id,
          estimated_arrival,
          processed_at,
          period_start,
          period_end,
          metadata,
          created_at,
          updated_at
        from public.author_payouts
        where stripe_transfer_id = $1
        limit 1
      `,
      [args.stripeTransferId],
    );

    if (existing.rows[0]) {
      return serializePayout(existing.rows[0]);
    }

    const result = await client.query<PayoutRow>(
      `
        insert into public.author_payouts (
          auth_user_id,
          amount,
          currency,
          status,
          method,
          stripe_transfer_id,
          stripe_account_id,
          estimated_arrival,
          processed_at,
          period_start,
          period_end,
          metadata
        )
        values (
          $1::uuid,
          $2::numeric,
          $3,
          'completed',
          'stripe',
          $4,
          $5,
          $6,
          now(),
          $7,
          $8,
          $9::jsonb
        )
        returning
          id,
          auth_user_id,
          amount,
          currency,
          status,
          method,
          stripe_transfer_id,
          stripe_account_id,
          estimated_arrival,
          processed_at,
          period_start,
          period_end,
          metadata,
          created_at,
          updated_at
      `,
      [
        args.userId,
        (args.amountInCents / 100).toFixed(2),
        normalizeCurrency(args.currency),
        args.stripeTransferId,
        args.stripeAccountId,
        args.estimatedArrival
          ? new Date(args.estimatedArrival).toISOString()
          : null,
        normalizePeriod(args.periodStart, "periodStart"),
        normalizePeriod(args.periodEnd, "periodEnd"),
        JSON.stringify({
          stripeTransferId: args.stripeTransferId,
        }),
      ],
    );

    return serializePayout(result.rows[0]);
  });
}

export async function listPayoutDataForUser(userId: string) {
  const [history, accounts] = await Promise.all([
    listPayoutHistoryForUser(userId),
    listPayoutAccountsForUser(userId),
  ]);

  return { history, accounts };
}

export async function recordBookSaleForUser(args: {
  userId: string;
  bookId: string;
  channel: string;
  period: string;
  unitsSold: number;
  grossRevenue: number;
  netRevenue: number;
  royaltyAmount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!Number.isFinite(args.unitsSold) || args.unitsSold < 0) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "unitsSold must be 0 or greater.");
  }

  await insforgeQuery(
    `
      insert into public.book_sales_records (
        book_id,
        auth_user_id,
        channel,
        period,
        units_sold,
        gross_revenue,
        net_revenue,
        royalty_amount,
        currency,
        metadata
      )
      values (
        $1::uuid,
        $2::uuid,
        $3,
        $4,
        $5,
        $6::numeric,
        $7::numeric,
        $8::numeric,
        $9,
        $10::jsonb
      )
    `,
    [
      args.bookId,
      args.userId,
      normalizeRequiredText(args.channel, "Channel"),
      normalizePeriod(args.period, "period"),
      args.unitsSold,
      Math.max(0, args.grossRevenue).toFixed(2),
      Math.max(0, args.netRevenue).toFixed(2),
      Math.max(0, args.royaltyAmount).toFixed(2),
      normalizeCurrency(args.currency),
      JSON.stringify(args.metadata ?? {}),
    ],
  );
}

export async function syncStripeAccountStatusForUser(args: {
  userId: string;
  accountId: string;
  payoutsEnabled: boolean;
  isDefault?: boolean;
}) {
  return savePayoutAccountForUser({
    userId: args.userId,
    method: "stripe",
    isDefault: args.isDefault ?? true,
    stripeConnectAccountId: args.accountId,
    stripeOnboardingComplete: args.payoutsEnabled,
  });
}

export async function getStripeAccountForUser(userId: string, method: PayoutMethod = "stripe") {
  const row = await getPayoutAccountRowByMethod(null, userId, method);
  return row ? serializePayoutAccount(row) : null;
}
