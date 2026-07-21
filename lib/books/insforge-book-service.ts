import type { PoolClient, QueryResultRow } from "pg";
import { insforgeQuery, withInsforgeTransaction } from "@/lib/insforge-db";
import { getProjectForUser } from "@/lib/projects/insforge-project-service";

const CREATOR_TAKE_RATE = 0.7;

export class InsforgeBookServiceError extends Error {
  code:
    | "NOT_FOUND"
    | "FORBIDDEN"
    | "INVALID_REQUEST"
    | "INSUFFICIENT_CREDITS"
    | "CONFLICT";

  constructor(
    code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_REQUEST"
      | "INSUFFICIENT_CREDITS"
      | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

type BookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "published"
  | "rejected"
  | "unpublished";

type AssetKind = "manuscript" | "cover";

type BookRow = {
  id: string;
  auth_user_id: string;
  legacy_user_id: string | null;
  source_project_id: string | null;
  legacy_project_id: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: BookStatus;
  engine_status: string | null;
  language: string;
  category: string | null;
  subcategory: string | null;
  keywords: string[] | null;
  price_display: string | number;
  currency_code: string;
  price_credits: number;
  completed_steps: string[] | null;
  current_step: number;
  agreement_accepted: boolean;
  agreement_name: string;
  agreement_scrolled: boolean;
  distribution_opt_in: boolean;
  google_play_url: string | null;
  isbn: string | null;
  rejection_reason: string | null;
  rejection_category: string | null;
  review_notes: string | null;
  reviewed_by_auth_user_id: string | null;
  reviewed_by_label: string | null;
  resubmission_count: number;
  sales_count: number;
  total_earned_credits: number;
  draft_created_at: Date | string;
  submitted_at: Date | string | null;
  approved_at: Date | string | null;
  published_at: Date | string | null;
  rejected_at: Date | string | null;
  unpublished_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type BookWithAssetsRow = BookRow & {
  manuscript_bucket: string | null;
  manuscript_storage_key: string | null;
  manuscript_url: string | null;
  manuscript_mime_type: string | null;
  manuscript_byte_size: number | null;
  manuscript_metadata: Record<string, unknown> | null;
  cover_bucket: string | null;
  cover_storage_key: string | null;
  cover_url: string | null;
  cover_mime_type: string | null;
  cover_byte_size: number | null;
  cover_metadata: Record<string, unknown> | null;
};

type UserCreditsRow = {
  id: string;
  auth_user_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
  total_received: number;
};

export type BookAssetInput = {
  bucket: string;
  key: string;
  url: string;
  mimeType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  metadata?: Record<string, unknown>;
};

export type BookDraftUpdateInput = {
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  language?: string;
  category?: string | null;
  subcategory?: string | null;
  keywords?: string[];
  listPrice?: string;
  currency?: string;
  currentStep?: number;
  completedSteps?: string[];
  agreementAccepted?: boolean;
  agreementName?: string;
  agreementScrolled?: boolean;
  distributionOptIn?: boolean;
};

export type BookModerationAction =
  | {
      action: "approve";
      notes?: string;
      isbn?: string;
    }
  | {
      action: "reject";
      reason: string;
      category?: string;
      notes?: string;
    }
  | {
      action: "publish";
      notes?: string;
      isbn?: string;
      googlePlayUrl?: string;
    }
  | {
      action: "unpublish";
      reason: string;
      notes?: string;
    };

export type SerializedBook = ReturnType<typeof toSerializedBook>;

function toMillis(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function normalizeMoney(input?: string | null) {
  const parsed = Number.parseFloat(input ?? "");
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "List price must be a non-negative number.",
    );
  }
  return parsed.toFixed(2);
}

function normalizeKeywordArray(input?: string[] | null) {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ).slice(0, 20);
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(input?: string | null, maxLength = 4000) {
  const normalized = input?.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function resolveProjectLanguage(project: Awaited<ReturnType<typeof getProjectForUser>>) {
  const settingsLanguage: string | null =
    project.settings &&
    typeof project.settings === "object" &&
    typeof (project.settings as Record<string, unknown>).language === "string"
      ? ((project.settings as Record<string, unknown>).language as string)
      : null;

  const normalized = (settingsLanguage ?? "en").trim().toLowerCase();
  return normalized.length > 0 ? normalized.slice(0, 16) : "en";
}

function resolveProjectCategory(project: Awaited<ReturnType<typeof getProjectForUser>>) {
  const settingsGenre: string | null =
    project.settings &&
    typeof project.settings === "object" &&
    typeof (project.settings as Record<string, unknown>).genre === "string"
      ? ((project.settings as Record<string, unknown>).genre as string)
      : null;

  const normalized = normalizeOptionalText(settingsGenre, 120);
  if (normalized) {
    return normalized;
  }

  if (project.type === "research") {
    return "research";
  }
  if (project.type === "assignment") {
    return "education";
  }
  return "fiction";
}

function resolveProjectKeywords(project: Awaited<ReturnType<typeof getProjectForUser>>) {
  const settingsKeywords =
    project.settings &&
    typeof project.settings === "object" &&
    Array.isArray((project.settings as Record<string, unknown>).keywords)
      ? ((project.settings as Record<string, unknown>).keywords as unknown[])
      : [];

  const titleKeywords = project.title
    .split(/[^a-zA-Z0-9]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 4)
    .slice(0, 3);

  return normalizeKeywordArray([
    ...settingsKeywords.filter((entry): entry is string => typeof entry === "string"),
    project.type,
    project.template ?? "",
    ...titleKeywords,
  ]);
}

function resolveProjectDescription(project: Awaited<ReturnType<typeof getProjectForUser>>) {
  const normalizedDescription = normalizeOptionalText(project.description, 4000);
  if (normalizedDescription) {
    return normalizedDescription;
  }

  const contentPreview = stripHtml(project.content ?? "").slice(0, 4000);
  return contentPreview.length > 0 ? contentPreview : null;
}

function stringifyDimensions(
  metadata: Record<string, unknown> | null | undefined,
) {
  const dimensions = metadata?.dimensions;
  return dimensions && typeof dimensions === "object"
    ? (dimensions as Record<string, unknown>)
    : null;
}

function toSerializedBook(row: BookWithAssetsRow) {
  return {
    _id: row.id,
    userId: row.auth_user_id,
    legacyUserId: row.legacy_user_id ?? undefined,
    projectId: row.source_project_id ?? row.legacy_project_id ?? undefined,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description ?? undefined,
    status: row.status,
    engineStatus: row.engine_status ?? undefined,
    language: row.language,
    category: row.category ?? undefined,
    subcategory: row.subcategory ?? undefined,
    keywords: row.keywords ?? [],
    listPrice: Number(row.price_display).toFixed(2),
    currency: row.currency_code,
    creditPrice: row.price_credits,
    completedSteps: row.completed_steps ?? [],
    currentStep: row.current_step,
    agreementAccepted: row.agreement_accepted,
    agreementName: row.agreement_name,
    agreementScrolled: row.agreement_scrolled,
    distributionOptIn: row.distribution_opt_in,
    googlePlayUrl: row.google_play_url ?? undefined,
    isbn: row.isbn ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    rejectionCategory: row.rejection_category ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    reviewedBy: row.reviewed_by_label ?? row.reviewed_by_auth_user_id ?? undefined,
    resubmissionCount: row.resubmission_count,
    salesCount: row.sales_count,
    totalEarnings: row.total_earned_credits,
    manuscriptBucket: row.manuscript_bucket ?? undefined,
    manuscriptKey: row.manuscript_storage_key ?? undefined,
    manuscriptUrl: row.manuscript_url ?? undefined,
    manuscriptName:
      typeof row.manuscript_metadata?.fileName === "string"
        ? row.manuscript_metadata.fileName
        : undefined,
    manuscriptSize: row.manuscript_byte_size ?? undefined,
    manuscriptFormat:
      typeof row.manuscript_metadata?.format === "string"
        ? row.manuscript_metadata.format
        : undefined,
    coverBucket: row.cover_bucket ?? undefined,
    coverKey: row.cover_storage_key ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    coverDimensions: stringifyDimensions(row.cover_metadata),
    timestamps: {
      draft: toMillis(row.draft_created_at),
      submitted: toMillis(row.submitted_at),
      approved: toMillis(row.approved_at),
      published: toMillis(row.published_at),
      rejected: toMillis(row.rejected_at),
      unpublished: toMillis(row.unpublished_at),
      createdAt: toMillis(row.created_at),
      updatedAt: toMillis(row.updated_at),
    },
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

async function fetchBookWithAssets(
  client: PoolClient | null,
  bookId: string,
) {
  const result = await runQuery<BookWithAssetsRow>(
    client,
    `
      select
        b.*,
        manuscript.bucket as manuscript_bucket,
        manuscript.storage_key as manuscript_storage_key,
        manuscript.url as manuscript_url,
        manuscript.mime_type as manuscript_mime_type,
        manuscript.byte_size as manuscript_byte_size,
        manuscript.metadata as manuscript_metadata,
        cover.bucket as cover_bucket,
        cover.storage_key as cover_storage_key,
        cover.url as cover_url,
        cover.mime_type as cover_mime_type,
        cover.byte_size as cover_byte_size,
        cover.metadata as cover_metadata
      from public.books b
      left join public.book_assets manuscript
        on manuscript.book_id = b.id
       and manuscript.asset_kind = 'manuscript'
      left join public.book_assets cover
        on cover.book_id = b.id
       and cover.asset_kind = 'cover'
      where b.id = $1::uuid
      limit 1
    `,
    [bookId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new InsforgeBookServiceError("NOT_FOUND", "Book not found.");
  }
  return row;
}

async function ensureBookAccess(args: {
  client: PoolClient | null;
  bookId: string;
  userId: string;
  allowPublishedRead?: boolean;
  allowAdmin?: boolean;
}) {
  const row = await fetchBookWithAssets(args.client, args.bookId);
  const isAdmin = args.allowAdmin ? await isAdminUser(args.userId, args.client) : false;
  if (
    row.auth_user_id !== args.userId &&
    !(args.allowPublishedRead && row.status === "published") &&
    !isAdmin
  ) {
    throw new InsforgeBookServiceError("FORBIDDEN", "You do not have access to this book.");
  }
  return { row, isAdmin };
}

async function isAdminUser(userId: string, client: PoolClient | null = null) {
  const result = await runQuery<{ is_admin: boolean }>(
    client,
    `select public.has_admin_role($1::uuid) as is_admin`,
    [userId],
  );
  return Boolean(result.rows[0]?.is_admin);
}

async function upsertBookAsset(args: {
  client: PoolClient;
  bookId: string;
  userId: string;
  assetKind: AssetKind;
  asset: BookAssetInput;
}) {
  await args.client.query(
    `
      insert into public.book_assets (
        book_id,
        asset_kind,
        bucket,
        storage_key,
        url,
        mime_type,
        byte_size,
        checksum,
        metadata,
        created_by_auth_user_id
      )
      values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::uuid)
      on conflict (book_id, asset_kind)
      do update set
        bucket = excluded.bucket,
        storage_key = excluded.storage_key,
        url = excluded.url,
        mime_type = excluded.mime_type,
        byte_size = excluded.byte_size,
        checksum = excluded.checksum,
        metadata = excluded.metadata,
        created_by_auth_user_id = excluded.created_by_auth_user_id,
        updated_at = now()
    `,
    [
      args.bookId,
      args.assetKind,
      args.asset.bucket,
      args.asset.key,
      args.asset.url,
      args.asset.mimeType ?? null,
      args.asset.byteSize ?? null,
      args.asset.checksum ?? null,
      JSON.stringify(args.asset.metadata ?? {}),
      args.userId,
    ],
  );
}

async function appendModerationEvent(args: {
  client: PoolClient;
  bookId: string;
  actorUserId: string;
  eventType:
    | "created"
    | "submitted"
    | "resubmitted"
    | "approved"
    | "rejected"
    | "published"
    | "unpublished"
    | "price_updated";
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  category?: string | null;
  notes?: string | null;
  payload?: Record<string, unknown>;
}) {
  await args.client.query(
    `
      insert into public.book_moderation_events (
        book_id,
        actor_auth_user_id,
        event_type,
        from_status,
        to_status,
        reason,
        category,
        notes,
        payload
      )
      values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      args.bookId,
      args.actorUserId,
      args.eventType,
      args.fromStatus ?? null,
      args.toStatus ?? null,
      args.reason ?? null,
      args.category ?? null,
      args.notes ?? null,
      JSON.stringify(args.payload ?? {}),
    ],
  );
}

function validateSubmission(row: SerializedBook) {
  if (!row.manuscriptKey) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Manuscript file is required.");
  }
  if (!row.coverKey) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Cover image is required.");
  }
  if (!row.title || row.title.trim().length < 3) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Valid title is required.");
  }
  if (!row.description || row.description.trim().length < 50) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "Description must be at least 50 characters.",
    );
  }
  if (!row.category) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Category is required.");
  }
  if ((row.keywords ?? []).length < 3) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "At least 3 keywords are required.",
    );
  }
  if (!row.agreementAccepted) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "Agreement must be accepted.",
    );
  }
}

export async function createBookDraft(args: {
  userId: string;
  title?: string;
  sourceProjectId?: string | null;
  legacyProjectId?: string | null;
  description?: string | null;
  language?: string;
  category?: string | null;
  keywords?: string[];
}) {
  return withInsforgeTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        insert into public.books (
          auth_user_id,
          source_project_id,
          legacy_project_id,
          title,
          description,
          language,
          category,
          keywords
        )
        values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::text[])
        returning id
      `,
      [
        args.userId,
        args.sourceProjectId ?? null,
        args.legacyProjectId ?? null,
        (args.title?.trim() || "Untitled Book").slice(0, 240),
        normalizeOptionalText(args.description, 4000),
        (args.language?.trim().toLowerCase() || "en").slice(0, 16),
        normalizeOptionalText(args.category, 120),
        normalizeKeywordArray(args.keywords),
      ],
    );
    const bookId = result.rows[0].id;
    await appendModerationEvent({
      client,
      bookId,
      actorUserId: args.userId,
      eventType: "created",
      toStatus: "draft",
    });
    return getBookDraftForUser(bookId, args.userId);
  });
}

async function findProjectLinkedDraftForUser(
  client: PoolClient | null,
  projectId: string,
  userId: string,
) {
  const result = await runQuery<{ id: string }>(
    client,
    `
      select id
      from public.books
      where auth_user_id = $1::uuid
        and source_project_id = $2::uuid
        and status in ('draft', 'rejected')
      order by updated_at desc
      limit 1
    `,
    [userId, projectId],
  );

  return result.rows[0]?.id ?? null;
}

export async function ensureProjectLinkedBookDraft(args: {
  userId: string;
  projectId: string;
  fallbackTitle?: string;
}) {
  const existingBookId = await findProjectLinkedDraftForUser(
    null,
    args.projectId,
    args.userId,
  );
  if (existingBookId) {
    return getBookDraftForUser(existingBookId, args.userId);
  }

  const project = await getProjectForUser(args.projectId, args.userId);

  return createBookDraft({
    userId: args.userId,
    sourceProjectId: args.projectId,
    title: project.title || args.fallbackTitle,
    description: resolveProjectDescription(project),
    language: resolveProjectLanguage(project),
    category: resolveProjectCategory(project),
    keywords: resolveProjectKeywords(project),
  });
}

export async function listBookDraftsForUser(userId: string) {
  const result = await insforgeQuery<{ id: string }>(
    `
      select id
      from public.books
      where auth_user_id = $1::uuid
      order by updated_at desc
    `,
    [userId],
  );

  return Promise.all(result.rows.map((row) => getBookDraftForUser(row.id, userId)));
}

export async function getBookDraftForUser(bookId: string, userId: string) {
  const { row } = await ensureBookAccess({
    client: null,
    bookId,
    userId,
    allowAdmin: true,
  });
  return toSerializedBook(row);
}

export async function getBookDraftForOwnerIdentifiers(args: {
  bookId: string;
  authUserId?: string | null;
  legacyUserId?: string | null;
}) {
  const row = await fetchBookWithAssets(null, args.bookId);
  const matchesAuthUser =
    typeof args.authUserId === "string" &&
    args.authUserId.length > 0 &&
    row.auth_user_id === args.authUserId;
  const matchesLegacyUser =
    typeof args.legacyUserId === "string" &&
    args.legacyUserId.length > 0 &&
    row.legacy_user_id === args.legacyUserId;

  if (!matchesAuthUser && !matchesLegacyUser) {
    throw new InsforgeBookServiceError(
      "FORBIDDEN",
      "You do not have access to this draft.",
    );
  }

  return toSerializedBook(row);
}

export async function updateBookDraftForUser(args: {
  bookId: string;
  userId: string;
  updates: BookDraftUpdateInput;
}) {
  return withInsforgeTransaction(async (client) => {
    const { row, isAdmin } = await ensureBookAccess({
      client,
      bookId: args.bookId,
      userId: args.userId,
      allowAdmin: true,
    });

    if (!isAdmin && row.auth_user_id !== args.userId) {
      throw new InsforgeBookServiceError("FORBIDDEN", "You do not own this draft.");
    }
    if (row.status !== "draft" && row.status !== "rejected") {
      throw new InsforgeBookServiceError(
        "CONFLICT",
        "Only draft or rejected books can be edited.",
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [args.bookId];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      sets.push(`${sql} = $${params.length}`);
    };

    if (typeof args.updates.title === "string") add("title", args.updates.title.trim() || "Untitled Book");
    if (typeof args.updates.subtitle !== "undefined") add("subtitle", args.updates.subtitle?.trim() || null);
    if (typeof args.updates.description !== "undefined") add("description", args.updates.description?.trim() || null);
    if (typeof args.updates.language === "string") add("language", args.updates.language.trim() || "en");
    if (typeof args.updates.category !== "undefined") add("category", args.updates.category?.trim() || null);
    if (typeof args.updates.subcategory !== "undefined") add("subcategory", args.updates.subcategory?.trim() || null);
    if (typeof args.updates.listPrice === "string") add("price_display", normalizeMoney(args.updates.listPrice));
    if (typeof args.updates.currency === "string") add("currency_code", args.updates.currency.trim() || "USD");
    if (typeof args.updates.currentStep === "number") add("current_step", Math.max(0, Math.floor(args.updates.currentStep)));
    if (typeof args.updates.agreementAccepted === "boolean") add("agreement_accepted", args.updates.agreementAccepted);
    if (typeof args.updates.agreementName === "string") add("agreement_name", args.updates.agreementName.trim());
    if (typeof args.updates.agreementScrolled === "boolean") add("agreement_scrolled", args.updates.agreementScrolled);
    if (typeof args.updates.distributionOptIn === "boolean") add("distribution_opt_in", args.updates.distributionOptIn);
    if (Array.isArray(args.updates.completedSteps)) add("completed_steps", args.updates.completedSteps);
    if (Array.isArray(args.updates.keywords)) add("keywords", normalizeKeywordArray(args.updates.keywords));

    if (sets.length === 0) {
      return toSerializedBook(row);
    }

    await client.query(
      `
        update public.books
        set ${sets.join(", ")}
        where id = $1::uuid
      `,
      params,
    );

    return getBookDraftForUser(args.bookId, args.userId);
  });
}

export async function attachBookAssetForUser(args: {
  bookId: string;
  userId: string;
  assetKind: AssetKind;
  asset: BookAssetInput;
}) {
  return withInsforgeTransaction(async (client) => {
    const { row } = await ensureBookAccess({
      client,
      bookId: args.bookId,
      userId: args.userId,
      allowAdmin: true,
    });
    if (row.auth_user_id !== args.userId) {
      throw new InsforgeBookServiceError("FORBIDDEN", "You do not own this draft.");
    }
    if (row.status !== "draft" && row.status !== "rejected") {
      throw new InsforgeBookServiceError(
        "CONFLICT",
        "Only draft or rejected books can be updated.",
      );
    }
    await upsertBookAsset({
      client,
      bookId: args.bookId,
      userId: args.userId,
      assetKind: args.assetKind,
      asset: args.asset,
    });
    return getBookDraftForUser(args.bookId, args.userId);
  });
}

export async function submitBookDraftForUser(args: {
  bookId: string;
  userId: string;
}) {
  return withInsforgeTransaction(async (client) => {
    const { row } = await ensureBookAccess({
      client,
      bookId: args.bookId,
      userId: args.userId,
      allowAdmin: false,
    });
    if (row.auth_user_id !== args.userId) {
      throw new InsforgeBookServiceError("FORBIDDEN", "You do not own this draft.");
    }
    if (row.status !== "draft" && row.status !== "rejected") {
      throw new InsforgeBookServiceError(
        "CONFLICT",
        "Only draft or rejected books can be submitted.",
      );
    }

    const serialized = toSerializedBook(row);
    validateSubmission(serialized);
    const nowColumn = row.status === "rejected" ? "resubmitted" : "submitted";

    await client.query(
      `
        update public.books
        set
          status = 'submitted',
          submitted_at = now(),
          rejected_at = null,
          rejection_reason = null,
          rejection_category = null,
          review_notes = null,
          reviewed_by_auth_user_id = null,
          reviewed_by_label = null,
          resubmission_count = case when $2 = 'rejected' then resubmission_count + 1 else resubmission_count end
        where id = $1::uuid
      `,
      [args.bookId, row.status],
    );

    await appendModerationEvent({
      client,
      bookId: args.bookId,
      actorUserId: args.userId,
      eventType: row.status === "rejected" ? "resubmitted" : "submitted",
      fromStatus: row.status,
      toStatus: "submitted",
      payload: { timestampKey: nowColumn },
    });

    return getBookDraftForUser(args.bookId, args.userId);
  });
}

export async function listPublishedBooks(args: {
  category?: string | null;
  query?: string | null;
  limit?: number;
}) {
  const params: unknown[] = ["published"];
  const where: string[] = ["b.status = $1"];

  if (args.category && args.category !== "All") {
    params.push(args.category);
    where.push(`b.category = $${params.length}`);
  }

  const query = args.query?.trim();
  if (query) {
    params.push(`%${query.replace(/\s+/g, "%")}%`);
    const idx = params.length;
    where.push(`(b.title ilike $${idx} or coalesce(b.description, '') ilike $${idx})`);
  }

  params.push(Math.max(1, Math.min(args.limit ?? 100, 200)));

  const result = await insforgeQuery<{ id: string }>(
    `
      select b.id
      from public.books b
      where ${where.join(" and ")}
      order by b.published_at desc nulls last, b.created_at desc
      limit $${params.length}
    `,
    params,
  );

  const books = await Promise.all(
    result.rows.map((row) => fetchBookWithAssets(null, row.id).then(toSerializedBook)),
  );

  return books;
}

export async function listBooksForAdmin(args: {
  status?: BookStatus | null;
  limit?: number;
}) {
  const requestedStatus = args.status?.trim() as BookStatus | undefined;
  const params: unknown[] = [];
  const where: string[] = [];

  if (requestedStatus) {
    params.push(requestedStatus);
    where.push(`b.status = $${params.length}`);
  } else {
    params.push("submitted");
    where.push(`b.status = $${params.length}`);
  }

  params.push(Math.max(1, Math.min(args.limit ?? 100, 200)));

  const result = await insforgeQuery<{ id: string }>(
    `
      select b.id
      from public.books b
      where ${where.join(" and ")}
      order by
        coalesce(b.submitted_at, b.updated_at, b.created_at) asc,
        b.created_at asc
      limit $${params.length}
    `,
    params,
  );

  return Promise.all(
    result.rows.map((row) => fetchBookWithAssets(null, row.id).then(toSerializedBook)),
  );
}

export async function getBookModerationStats() {
  const result = await insforgeQuery<{ status: BookStatus; count: string }>(
    `
      select
        status,
        count(*)::text as count
      from public.books
      group by status
    `,
  );

  const counts = new Map(result.rows.map((row) => [row.status, Number.parseInt(row.count, 10) || 0]));

  return {
    submitted: counts.get("submitted") ?? 0,
    inReview: 0,
    approved: counts.get("approved") ?? 0,
    published: counts.get("published") ?? 0,
    rejected: counts.get("rejected") ?? 0,
    unpublished: counts.get("unpublished") ?? 0,
    total:
      (counts.get("submitted") ?? 0) +
      (counts.get("approved") ?? 0) +
      (counts.get("published") ?? 0) +
      (counts.get("rejected") ?? 0) +
      (counts.get("unpublished") ?? 0) +
      (counts.get("draft") ?? 0),
  };
}

export async function getPublishedBookDetail(bookId: string) {
  const row = await fetchBookWithAssets(null, bookId);
  if (row.status !== "published") {
    throw new InsforgeBookServiceError("NOT_FOUND", "Book not found.");
  }
  return toSerializedBook(row);
}

export async function getCreditsBalanceForUser(userId: string) {
  const result = await insforgeQuery<UserCreditsRow>(
    `
      select *
      from public.user_credits
      where auth_user_id = $1::uuid
      limit 1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      totalReceived: 0,
    };
  }

  return {
    balance: row.balance,
    totalPurchased: row.total_purchased,
    totalSpent: row.total_spent,
    totalReceived: row.total_received,
  };
}

export async function creditWalletPurchase(args: {
  userId: string;
  amount: number;
  providerPaymentId: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  if (!Number.isInteger(args.amount) || args.amount <= 0) {
    throw new InsforgeBookServiceError("INVALID_REQUEST", "Credit amount must be a positive integer.");
  }

  return withInsforgeTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `
        select id
        from public.credit_transactions
        where auth_user_id = $1::uuid
          and provider_payment_id = $2
          and transaction_type = 'credit_purchase'
        limit 1
      `,
      [args.userId, args.providerPaymentId],
    );

    if (existing.rows[0]) {
      const balance = await getCreditsBalanceForUser(args.userId);
      return { success: true, alreadyCredited: true, newBalance: balance.balance };
    }

    const walletResult = await client.query<UserCreditsRow>(
      `
        insert into public.user_credits (
          auth_user_id,
          balance,
          total_purchased
        )
        values ($1::uuid, $2, $2)
        on conflict (auth_user_id)
        do update set
          balance = public.user_credits.balance + excluded.balance,
          total_purchased = public.user_credits.total_purchased + excluded.total_purchased,
          updated_at = now()
        returning *
      `,
      [args.userId, args.amount],
    );

    const wallet = walletResult.rows[0];

    await client.query(
      `
        insert into public.credit_transactions (
          auth_user_id,
          transaction_type,
          amount,
          balance_after,
          description,
          provider_payment_id,
          metadata
        )
        values ($1::uuid, 'credit_purchase', $2, $3, $4, $5, $6::jsonb)
      `,
      [
        args.userId,
        args.amount,
        wallet.balance,
        args.description,
        args.providerPaymentId,
        JSON.stringify(args.metadata ?? {}),
      ],
    );

    return {
      success: true,
      alreadyCredited: false,
      newBalance: wallet.balance,
    };
  });
}

export async function getBookAccessForUser(bookId: string, userId: string) {
  const row = await fetchBookWithAssets(null, bookId);
  if (row.status !== "published") {
    return { hasAccess: false, isAuthor: false, isFree: false };
  }

  if (row.auth_user_id === userId) {
    return { hasAccess: true, isAuthor: true, isFree: row.price_credits <= 0 };
  }

  if (row.price_credits <= 0) {
    return { hasAccess: true, isAuthor: false, isFree: true };
  }

  const purchase = await insforgeQuery<{ created_at: Date | string }>(
    `
      select created_at
      from public.book_purchases
      where book_id = $1::uuid
        and buyer_auth_user_id = $2::uuid
      limit 1
    `,
    [bookId, userId],
  );

  if (purchase.rows[0]) {
    return {
      hasAccess: true,
      isAuthor: false,
      isFree: false,
      purchase: {
        purchasedAt: toMillis(purchase.rows[0].created_at),
      },
    };
  }

  return { hasAccess: false, isAuthor: false, isFree: false };
}

export async function purchasePublishedBookForUser(args: {
  bookId: string;
  userId: string;
}) {
  return withInsforgeTransaction(async (client) => {
    const row = await fetchBookWithAssets(client, args.bookId);
    if (row.status !== "published") {
      throw new InsforgeBookServiceError("CONFLICT", "Book is not available for purchase.");
    }
    if (row.auth_user_id === args.userId) {
      throw new InsforgeBookServiceError("INVALID_REQUEST", "Cannot purchase your own book.");
    }
    if (row.price_credits <= 0) {
      throw new InsforgeBookServiceError("INVALID_REQUEST", "This book is free.");
    }

    const existingPurchase = await client.query<{ id: string }>(
      `
        select id
        from public.book_purchases
        where book_id = $1::uuid
          and buyer_auth_user_id = $2::uuid
        limit 1
      `,
      [args.bookId, args.userId],
    );

    if (existingPurchase.rows[0]) {
      const balance = await getCreditsBalanceForUser(args.userId);
      return {
        success: true,
        alreadyPurchased: true,
        newBalance: balance.balance,
      };
    }

    const walletResult = await client.query<UserCreditsRow>(
      `
        select *
        from public.user_credits
        where auth_user_id = $1::uuid
        for update
      `,
      [args.userId],
    );
    const wallet = walletResult.rows[0];
    if (!wallet || wallet.balance < row.price_credits) {
      throw new InsforgeBookServiceError(
        "INSUFFICIENT_CREDITS",
        "Insufficient credit balance.",
      );
    }

    const creatorCredits = Math.floor(row.price_credits * CREATOR_TAKE_RATE);
    const platformCredits = row.price_credits - creatorCredits;

    const updatedBuyer = await client.query<UserCreditsRow>(
      `
        update public.user_credits
        set
          balance = balance - $2,
          total_spent = total_spent + $2
        where auth_user_id = $1::uuid
        returning *
      `,
      [args.userId, row.price_credits],
    );

    const updatedSeller = await client.query<UserCreditsRow>(
      `
        insert into public.user_credits (
          auth_user_id,
          balance,
          total_received
        )
        values ($1::uuid, $2, $2)
        on conflict (auth_user_id)
        do update set
          balance = public.user_credits.balance + excluded.balance,
          total_received = public.user_credits.total_received + excluded.total_received,
          updated_at = now()
        returning *
      `,
      [row.auth_user_id, creatorCredits],
    );

    const purchase = await client.query<{ id: string }>(
      `
        insert into public.book_purchases (
          book_id,
          buyer_auth_user_id,
          seller_auth_user_id,
          credits_charged,
          creator_credits,
          platform_credits
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
        returning id
      `,
      [
        args.bookId,
        args.userId,
        row.auth_user_id,
        row.price_credits,
        creatorCredits,
        platformCredits,
      ],
    );

    await client.query(
      `
        insert into public.book_library_entries (
          book_id,
          auth_user_id,
          purchase_id,
          access_source
        )
        values ($1::uuid, $2::uuid, $3::uuid, 'purchase')
        on conflict (book_id, auth_user_id) do nothing
      `,
      [args.bookId, args.userId, purchase.rows[0].id],
    );

    await client.query(
      `
        update public.books
        set
          sales_count = sales_count + 1,
          total_earned_credits = total_earned_credits + $2
        where id = $1::uuid
      `,
      [args.bookId, creatorCredits],
    );

    await client.query(
      `
        insert into public.credit_transactions (
          auth_user_id,
          transaction_type,
          amount,
          balance_after,
          description,
          reference_type,
          reference_id
        )
        values
          ($1::uuid, 'book_purchase', $2, $3, $4, 'book', $5::uuid),
          ($6::uuid, 'book_sale', $7, $8, $9, 'book', $5::uuid)
      `,
      [
        args.userId,
        -row.price_credits,
        updatedBuyer.rows[0].balance,
        `Purchased "${row.title}" for ${row.price_credits} Credits`,
        args.bookId,
        row.auth_user_id,
        creatorCredits,
        updatedSeller.rows[0].balance,
        `Sale of "${row.title}"`,
      ],
    );

    return {
      success: true,
      alreadyPurchased: false,
      creditAmount: row.price_credits,
      masterReceived: creatorCredits,
      platformFee: platformCredits,
      newBalance: updatedBuyer.rows[0].balance,
    };
  });
}

export async function listPurchasedLibraryForUser(userId: string) {
  const result = await insforgeQuery<{
    purchase_id: string;
    purchased_at: Date | string;
    credits_charged: number;
    book_id: string;
  }>(
    `
      select
        p.id as purchase_id,
        p.created_at as purchased_at,
        p.credits_charged,
        p.book_id
      from public.book_purchases p
      where p.buyer_auth_user_id = $1::uuid
      order by p.created_at desc
    `,
    [userId],
  );

  return Promise.all(
    result.rows.map(async (row) => {
      const book = toSerializedBook(await fetchBookWithAssets(null, row.book_id));
      return {
        _id: row.purchase_id,
        bookId: row.book_id,
        bookTitle: book.title,
        bookSubtitle: book.subtitle,
        bookCoverUrl: book.coverUrl,
        bookAuthor: book.userId,
        creditAmount: row.credits_charged,
        purchasedAt: toMillis(row.purchased_at),
      };
    }),
  );
}

export async function listBookSalesForUser(userId: string) {
  const result = await insforgeQuery<{
    book_id: string;
    total_sales: number;
    total_earned: number;
  }>(
    `
      select
        b.id as book_id,
        count(p.id)::integer as total_sales,
        coalesce(sum(p.creator_credits), 0)::integer as total_earned
      from public.books b
      left join public.book_purchases p
        on p.book_id = b.id
      where b.auth_user_id = $1::uuid
        and b.status = 'published'
      group by b.id
      order by total_earned desc, total_sales desc
    `,
    [userId],
  );

  const books = await Promise.all(
    result.rows.map(async (row) => {
      const book = toSerializedBook(await fetchBookWithAssets(null, row.book_id));
      return {
        bookId: row.book_id,
        title: book.title,
        coverUrl: book.coverUrl,
        creditPrice: book.creditPrice ?? 0,
        salesCount: row.total_sales,
        totalEarned: row.total_earned,
      };
    }),
  );

  return {
    totalSales: books.reduce((sum, book) => sum + book.salesCount, 0),
    totalEarned: books.reduce((sum, book) => sum + book.totalEarned, 0),
    books,
  };
}

export async function setPublishedBookPriceForUser(args: {
  bookId: string;
  userId: string;
  creditPrice: number;
}) {
  if (!Number.isInteger(args.creditPrice) || args.creditPrice < 0) {
    throw new InsforgeBookServiceError(
      "INVALID_REQUEST",
      "Price must be a whole number of credits.",
    );
  }

  return withInsforgeTransaction(async (client) => {
    const { row } = await ensureBookAccess({
      client,
      bookId: args.bookId,
      userId: args.userId,
      allowAdmin: false,
    });
    if (row.auth_user_id !== args.userId) {
      throw new InsforgeBookServiceError("FORBIDDEN", "You can only price your own books.");
    }
    if (row.status !== "published") {
      throw new InsforgeBookServiceError(
        "CONFLICT",
        "Can only set price on published books.",
      );
    }

    await client.query(
      `
        update public.books
        set price_credits = $2
        where id = $1::uuid
      `,
      [args.bookId, args.creditPrice],
    );

    await appendModerationEvent({
      client,
      bookId: args.bookId,
      actorUserId: args.userId,
      eventType: "price_updated",
      fromStatus: row.status,
      toStatus: row.status,
      payload: { creditPrice: args.creditPrice },
    });

    return getPublishedBookDetail(args.bookId);
  });
}

export async function getManuscriptAssetForUser(args: {
  bookId: string;
  userId: string;
}) {
  const row = await fetchBookWithAssets(null, args.bookId);
  if (!row.manuscript_storage_key || !row.manuscript_bucket) {
    throw new InsforgeBookServiceError("NOT_FOUND", "No manuscript is available for this book.");
  }

  const isAdmin = await isAdminUser(args.userId);
  const isAuthor = row.auth_user_id === args.userId;
  const isPublished = row.status === "published";
  const isFree = row.price_credits <= 0;

  if (!isAuthor && !isAdmin) {
    if (!isPublished) {
      throw new InsforgeBookServiceError("NOT_FOUND", "Book not found.");
    }
    if (!isFree) {
      const purchase = await insforgeQuery<{ id: string }>(
        `
          select id
          from public.book_purchases
          where book_id = $1::uuid
            and buyer_auth_user_id = $2::uuid
          limit 1
        `,
        [args.bookId, args.userId],
      );

      if (!purchase.rows[0]) {
        throw new InsforgeBookServiceError(
          "FORBIDDEN",
          "You must purchase this book to download it.",
        );
      }
    }
  }

  return {
    bucket: row.manuscript_bucket,
    key: row.manuscript_storage_key,
    name:
      typeof row.manuscript_metadata?.fileName === "string"
        ? row.manuscript_metadata.fileName
        : `${row.title}.epub`,
    format:
      typeof row.manuscript_metadata?.format === "string"
        ? row.manuscript_metadata.format
        : "EPUB",
  };
}

export async function moderateBookForAdmin(args: {
  bookId: string;
  adminUserId: string;
  adminLabel: string;
  action: BookModerationAction;
}) {
  return withInsforgeTransaction(async (client) => {
    const row = await fetchBookWithAssets(client, args.bookId);
    const isAdmin = await isAdminUser(args.adminUserId, client);
    if (!isAdmin) {
      throw new InsforgeBookServiceError("FORBIDDEN", "Admin access is required.");
    }

    let nextStatus: BookStatus;
    let eventType: Parameters<typeof appendModerationEvent>[0]["eventType"];
    const patch: string[] = [];
    const params: unknown[] = [args.bookId];

    const push = (field: string, value: unknown) => {
      params.push(value);
      patch.push(`${field} = $${params.length}`);
    };

    switch (args.action.action) {
      case "approve":
        if (row.status !== "submitted" && row.status !== "approved") {
          throw new InsforgeBookServiceError("CONFLICT", "Only submitted books can be approved.");
        }
        nextStatus = "approved";
        eventType = "approved";
        push("status", "approved");
        push("approved_at", new Date());
        push("review_notes", args.action.notes ?? null);
        push("reviewed_by_auth_user_id", args.adminUserId);
        push("reviewed_by_label", args.adminLabel);
        if (typeof args.action.isbn === "string") {
          push("isbn", args.action.isbn.trim() || null);
        }
        break;
      case "reject":
        if (row.status !== "submitted" && row.status !== "approved") {
          throw new InsforgeBookServiceError("CONFLICT", "Only submitted or approved books can be rejected.");
        }
        nextStatus = "rejected";
        eventType = "rejected";
        push("status", "rejected");
        push("rejected_at", new Date());
        push("rejection_reason", args.action.reason);
        push("rejection_category", args.action.category ?? "other");
        push("review_notes", args.action.notes ?? null);
        push("reviewed_by_auth_user_id", args.adminUserId);
        push("reviewed_by_label", args.adminLabel);
        break;
      case "publish":
        if (row.status !== "approved" && row.status !== "published") {
          throw new InsforgeBookServiceError("CONFLICT", "Only approved books can be published.");
        }
        nextStatus = "published";
        eventType = "published";
        push("status", "published");
        push("published_at", new Date());
        push("review_notes", args.action.notes ?? row.review_notes);
        push("reviewed_by_auth_user_id", args.adminUserId);
        push("reviewed_by_label", args.adminLabel);
        if (typeof args.action.isbn === "string") {
          push("isbn", args.action.isbn.trim() || null);
        }
        if (typeof args.action.googlePlayUrl === "string") {
          push("google_play_url", args.action.googlePlayUrl.trim() || null);
        }
        break;
      case "unpublish":
        if (row.status !== "published") {
          throw new InsforgeBookServiceError("CONFLICT", "Only published books can be unpublished.");
        }
        nextStatus = "unpublished";
        eventType = "unpublished";
        push("status", "unpublished");
        push("unpublished_at", new Date());
        push("rejection_reason", args.action.reason);
        push("review_notes", args.action.notes ?? null);
        push("reviewed_by_auth_user_id", args.adminUserId);
        push("reviewed_by_label", args.adminLabel);
        break;
    }

    await client.query(
      `
        update public.books
        set ${patch.join(", ")}
        where id = $1::uuid
      `,
      params,
    );

    await appendModerationEvent({
      client,
      bookId: args.bookId,
      actorUserId: args.adminUserId,
      eventType,
      fromStatus: row.status,
      toStatus: nextStatus,
      reason:
        args.action.action === "reject" || args.action.action === "unpublish"
          ? args.action.reason
          : null,
      category: args.action.action === "reject" ? args.action.category ?? "other" : null,
      notes: "notes" in args.action ? args.action.notes ?? null : null,
    });

    return getBookDraftForUser(args.bookId, args.adminUserId);
  });
}
