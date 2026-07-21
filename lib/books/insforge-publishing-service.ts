import { createHash } from "crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { insforgeQuery, withInsforgeTransaction } from "@/lib/insforge-db";
import {
  getBookDraftForUser,
  InsforgeBookServiceError,
} from "@/lib/books/insforge-book-service";

type TaxProfileRow = {
  auth_user_id: string;
  form_type: "W-9" | "W-8BEN";
  country: string;
  legal_name: string;
  tax_id_last4: string | null;
  tax_id_hash: string | null;
  address: string;
  city: string;
  postal_code: string;
  treaty_benefit: boolean;
  treaty_country: string | null;
  withholding_rate: string | number;
  updated_at: Date | string;
};

type DistributionRecordRow = {
  id: string;
  book_id: string;
  auth_user_id: string;
  job_id: string;
  publishdrive_book_id: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: Date | string;
  updated_at: Date | string;
};

type DistributionChannelRow = {
  distribution_record_id: string;
  channel_id: string;
  channel_name: string;
  status:
    | "pending"
    | "processing"
    | "review"
    | "in_review"
    | "live"
    | "failed"
    | "removed";
  url: string | null;
  updated_at: Date | string;
};

type NotificationRow = {
  id: string;
  book_id: string;
  notification_type: string;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  read_at: Date | string | null;
  created_at: Date | string;
  book_title: string | null;
};

export type DistributionChannelInput = {
  channelId: string;
  channelName: string;
  status:
    | "pending"
    | "processing"
    | "review"
    | "in_review"
    | "live"
    | "failed"
    | "removed";
  url?: string | null;
  updatedAt?: number;
};

function toMillis(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
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

async function ensureOwnedBook(bookId: string, userId: string) {
  const book = await getBookDraftForUser(bookId, userId);
  if (book.userId !== userId) {
    throw new InsforgeBookServiceError("FORBIDDEN", "You do not own this book.");
  }
  return book;
}

function normalizeCountry(input: string) {
  const country = input.trim().toUpperCase();
  if (!country || country.length > 4) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Country is required.");
  }
  return country;
}

function normalizeRequiredText(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", `${fieldLabel} is required.`);
  }
  return normalized;
}

function normalizeWithholdingRate(input: number) {
  if (!Number.isFinite(input) || input < 0 || input > 1) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "withholdingRate must be between 0 and 1.",
    );
  }
  return input.toFixed(4);
}

function hashTaxId(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function serializeTaxProfile(row: TaxProfileRow | null) {
  if (!row) return null;
  return {
    country: row.country,
    formType: row.form_type,
    legalName: row.legal_name,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    treatyBenefit: row.treaty_benefit,
    treatyCountry: row.treaty_country ?? undefined,
    withholdingRate: Number(row.withholding_rate),
    taxIdOnFile: Boolean(row.tax_id_hash),
    taxIdLast4: row.tax_id_last4 ?? undefined,
    updatedAt: toMillis(row.updated_at),
  };
}

function serializeDistributionRecord(
  record: DistributionRecordRow,
  channels: DistributionChannelRow[],
) {
  return {
    _id: record.id,
    bookId: record.book_id,
    userId: record.auth_user_id,
    jobId: record.job_id,
    publishDriveBookId: record.publishdrive_book_id ?? undefined,
    status: record.status,
    createdAt: toMillis(record.created_at),
    updatedAt: toMillis(record.updated_at),
    channels: channels.map((channel) => ({
      channelId: channel.channel_id,
      channelName: channel.channel_name,
      status: channel.status,
      url: channel.url ?? undefined,
      updatedAt: toMillis(channel.updated_at),
    })),
  };
}

function serializeNotification(row: NotificationRow) {
  return {
    bookId: row.book_id,
    bookTitle: row.book_title ?? "Untitled Book",
    notification: {
      id: row.id,
      type: row.notification_type,
      title: row.title,
      message: row.message,
      createdAt: toMillis(row.created_at),
      payload: row.payload ?? {},
      readAt: toMillis(row.read_at),
    },
  };
}

async function getDistributionRecordRowByBookId(
  client: PoolClient | null,
  bookId: string,
) {
  const result = await runQuery<DistributionRecordRow>(
    client,
    `
      select
        id,
        book_id,
        auth_user_id,
        job_id,
        publishdrive_book_id,
        status,
        created_at,
        updated_at
      from public.book_distribution_records
      where book_id = $1::uuid
      limit 1
    `,
    [bookId],
  );
  return result.rows[0] ?? null;
}

async function getDistributionRecordRowByPublishDriveId(
  client: PoolClient | null,
  publishDriveBookId: string,
) {
  const result = await runQuery<DistributionRecordRow>(
    client,
    `
      select
        id,
        book_id,
        auth_user_id,
        job_id,
        publishdrive_book_id,
        status,
        created_at,
        updated_at
      from public.book_distribution_records
      where publishdrive_book_id = $1
      limit 1
    `,
    [publishDriveBookId],
  );
  return result.rows[0] ?? null;
}

async function listDistributionChannels(
  client: PoolClient | null,
  recordId: string,
) {
  const result = await runQuery<DistributionChannelRow>(
    client,
    `
      select
        distribution_record_id,
        channel_id,
        channel_name,
        status,
        url,
        updated_at
      from public.book_distribution_channels
      where distribution_record_id = $1::uuid
      order by channel_name asc
    `,
    [recordId],
  );
  return result.rows;
}

async function replaceDistributionChannels(args: {
  client: PoolClient;
  recordId: string;
  channels: DistributionChannelInput[];
}) {
  await args.client.query(
    `
      delete from public.book_distribution_channels
      where distribution_record_id = $1::uuid
    `,
    [args.recordId],
  );

  for (const channel of args.channels) {
    await args.client.query(
      `
        insert into public.book_distribution_channels (
          distribution_record_id,
          channel_id,
          channel_name,
          status,
          url,
          updated_at
        )
        values ($1::uuid, $2, $3, $4, $5, to_timestamp($6::double precision / 1000.0))
      `,
      [
        args.recordId,
        channel.channelId,
        channel.channelName,
        channel.status,
        channel.url ?? null,
        channel.updatedAt ?? Date.now(),
      ],
    );
  }
}

export async function listUnreadPublishingNotificationsForUser(userId: string) {
  const result = await insforgeQuery<NotificationRow>(
    `
      select
        n.id,
        n.book_id,
        n.notification_type,
        n.title,
        n.message,
        n.payload,
        n.read_at,
        n.created_at,
        b.title as book_title
      from public.book_notifications n
      left join public.books b
        on b.id = n.book_id
      where n.auth_user_id = $1::uuid
        and n.read_at is null
      order by n.created_at desc
      limit 50
    `,
    [userId],
  );

  return result.rows.map(serializeNotification);
}

export async function markPublishingNotificationsReadForUser(args: {
  userId: string;
  bookId?: string;
  notificationIds: string[];
}) {
  if (args.notificationIds.length === 0) {
    return { updatedCount: 0 };
  }

  await withInsforgeTransaction(async (client) => {
    if (args.bookId) {
      await ensureOwnedBook(args.bookId, args.userId);
    }

    await client.query(
      `
        update public.book_notifications
        set
          read_at = coalesce(read_at, now()),
          updated_at = now()
        where auth_user_id = $1::uuid
          and ($2::uuid is null or book_id = $2::uuid)
          and id = any($3::uuid[])
      `,
      [args.userId, args.bookId ?? null, args.notificationIds],
    );
  });

  return { updatedCount: args.notificationIds.length };
}

export async function createPublishingNotification(args: {
  userId: string;
  bookId: string;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  await insforgeQuery(
    `
      insert into public.book_notifications (
        auth_user_id,
        book_id,
        notification_type,
        title,
        message,
        payload
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)
    `,
    [
      args.userId,
      args.bookId,
      args.type,
      args.title.trim(),
      args.message.trim(),
      JSON.stringify(args.payload ?? {}),
    ],
  );
}

export async function getTaxProfileForUser(userId: string) {
  const result = await insforgeQuery<TaxProfileRow>(
    `
      select
        auth_user_id,
        form_type,
        country,
        legal_name,
        tax_id_last4,
        tax_id_hash,
        address,
        city,
        postal_code,
        treaty_benefit,
        treaty_country,
        withholding_rate,
        updated_at
      from public.author_tax_profiles
      where auth_user_id = $1::uuid
      limit 1
    `,
    [userId],
  );

  return serializeTaxProfile(result.rows[0] ?? null);
}

export async function saveTaxProfileForUser(args: {
  userId: string;
  formType: "W-9" | "W-8BEN";
  country: string;
  taxId: string;
  legalName: string;
  address: string;
  city: string;
  postalCode: string;
  treatyBenefit?: boolean;
  treatyCountry?: string;
  withholdingRate: number;
}) {
  return withInsforgeTransaction(async (client) => {
    const existing = await runQuery<TaxProfileRow>(
      client,
      `
        select
          auth_user_id,
          form_type,
          country,
          legal_name,
          tax_id_last4,
          tax_id_hash,
          address,
          city,
          postal_code,
          treaty_benefit,
          treaty_country,
          withholding_rate,
          updated_at
        from public.author_tax_profiles
        where auth_user_id = $1::uuid
        limit 1
      `,
      [args.userId],
    );

    const taxIdInput = args.taxId.trim();
    let taxIdLast4 = existing.rows[0]?.tax_id_last4 ?? null;
    let taxIdHash = existing.rows[0]?.tax_id_hash ?? null;

    if (taxIdInput === "UNCHANGED") {
      if (!taxIdHash) {
        throw new InsforgeBookServiceError(
          "INVALID_REQUEST",
          "A tax identifier is required before it can be kept unchanged.",
        );
      }
    } else {
      if (taxIdInput.length < 4) {
        throw new InsforgeBookServiceError(
          "INVALID_REQUEST",
          "Tax identifier must be at least 4 characters.",
        );
      }
      taxIdLast4 = taxIdInput.slice(-4);
      taxIdHash = hashTaxId(taxIdInput);
    }

    await client.query(
      `
        insert into public.author_tax_profiles (
          auth_user_id,
          form_type,
          country,
          legal_name,
          tax_id_last4,
          tax_id_hash,
          address,
          city,
          postal_code,
          treaty_benefit,
          treaty_country,
          withholding_rate
        )
        values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::numeric)
        on conflict (auth_user_id)
        do update set
          form_type = excluded.form_type,
          country = excluded.country,
          legal_name = excluded.legal_name,
          tax_id_last4 = excluded.tax_id_last4,
          tax_id_hash = excluded.tax_id_hash,
          address = excluded.address,
          city = excluded.city,
          postal_code = excluded.postal_code,
          treaty_benefit = excluded.treaty_benefit,
          treaty_country = excluded.treaty_country,
          withholding_rate = excluded.withholding_rate,
          updated_at = now()
      `,
      [
        args.userId,
        args.formType,
        normalizeCountry(args.country),
        normalizeRequiredText(args.legalName, "Legal name"),
        taxIdLast4,
        taxIdHash,
        normalizeRequiredText(args.address, "Address"),
        normalizeRequiredText(args.city, "City"),
        normalizeRequiredText(args.postalCode, "Postal code"),
        Boolean(args.treatyBenefit),
        args.treatyBenefit ? normalizeCountry(args.treatyCountry ?? args.country) : null,
        normalizeWithholdingRate(args.withholdingRate),
      ],
    );

    return getTaxProfileForUser(args.userId);
  });
}

export async function getDistributionRecordForUser(args: {
  bookId: string;
  userId: string;
}) {
  await ensureOwnedBook(args.bookId, args.userId);

  const record = await getDistributionRecordRowByBookId(null, args.bookId);
  if (!record) return null;

  const channels = await listDistributionChannels(null, record.id);
  return serializeDistributionRecord(record, channels);
}

export async function getDistributionRecordByPublishDriveId(
  publishDriveBookId: string,
) {
  const record = await getDistributionRecordRowByPublishDriveId(null, publishDriveBookId);
  if (!record) return null;

  const channels = await listDistributionChannels(null, record.id);
  return serializeDistributionRecord(record, channels);
}

export async function upsertDistributionRecord(args: {
  bookId: string;
  userId: string;
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  publishDriveBookId?: string | null;
  channels: DistributionChannelInput[];
}) {
  await ensureOwnedBook(args.bookId, args.userId);

  return withInsforgeTransaction(async (client) => {
    const result = await client.query<DistributionRecordRow>(
      `
        insert into public.book_distribution_records (
          book_id,
          auth_user_id,
          job_id,
          publishdrive_book_id,
          status
        )
        values ($1::uuid, $2::uuid, $3, $4, $5)
        on conflict (book_id)
        do update set
          auth_user_id = excluded.auth_user_id,
          job_id = excluded.job_id,
          publishdrive_book_id = coalesce(excluded.publishdrive_book_id, public.book_distribution_records.publishdrive_book_id),
          status = excluded.status,
          updated_at = now()
        returning
          id,
          book_id,
          auth_user_id,
          job_id,
          publishdrive_book_id,
          status,
          created_at,
          updated_at
      `,
      [
        args.bookId,
        args.userId,
        args.jobId,
        args.publishDriveBookId ?? null,
        args.status,
      ],
    );

    const record = result.rows[0];
    await replaceDistributionChannels({
      client,
      recordId: record.id,
      channels: args.channels,
    });

    const channels = await listDistributionChannels(client, record.id);
    return serializeDistributionRecord(record, channels);
  });
}

export async function updateDistributionStatusByPublishDriveId(args: {
  publishDriveBookId: string;
  status: "pending" | "processing" | "completed" | "failed";
  channels: DistributionChannelInput[];
}) {
  return withInsforgeTransaction(async (client) => {
    const record = await getDistributionRecordRowByPublishDriveId(
      client,
      args.publishDriveBookId,
    );

    if (!record) {
      throw new InsforgeBookServiceError("NOT_FOUND", "Distribution record not found.");
    }

    const result = await client.query<DistributionRecordRow>(
      `
        update public.book_distribution_records
        set
          status = $2,
          updated_at = now()
        where publishdrive_book_id = $1
        returning
          id,
          book_id,
          auth_user_id,
          job_id,
          publishdrive_book_id,
          status,
          created_at,
          updated_at
      `,
      [args.publishDriveBookId, args.status],
    );

    const updatedRecord = result.rows[0] ?? record;
    await replaceDistributionChannels({
      client,
      recordId: updatedRecord.id,
      channels: args.channels,
    });

    const channels = await listDistributionChannels(client, updatedRecord.id);
    return serializeDistributionRecord(updatedRecord, channels);
  });
}
