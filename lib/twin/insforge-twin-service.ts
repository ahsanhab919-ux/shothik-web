import type { QueryResultRow } from "pg";
import { insforgeQuery } from "@/lib/insforge-db";

export type TwinNotificationType =
  | "format_complete"
  | "review_needed"
  | "forum_opened"
  | "revision_requested"
  | "distribution_failed"
  | "distribution_submitted";

type TwinRow = {
  id: string;
  auth_user_id: string | null;
  legacy_master_id: string | null;
  name: string;
  specialization: string | null;
  source_platform: string;
  training_status: string;
  knowledge_score: number;
  is_active: boolean;
  task_count: number;
  lifecycle_state: string;
  verification_badge: boolean;
  trust_score: number;
  published_count: number;
  followers_count: number;
  allowed_skills: string[] | null;
  blocked_skills: string[] | null;
  approval_required_actions: string[] | null;
  master_email: string | null;
  master_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type TwinNotificationRow = {
  id: string;
  master_auth_user_id: string | null;
  master_identifier: string;
  twin_id: string | null;
  twin_name: string | null;
  notification_type: TwinNotificationType;
  book_id: string | null;
  book_title: string | null;
  forum_id: string | null;
  message: string;
  feedback: string | null;
  is_read: boolean;
  created_at: Date | string;
};

function toMillis(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function serializeTwinNotification(row: TwinNotificationRow) {
  return {
    _id: row.id,
    masterId: row.master_identifier,
    twinId: row.twin_id ?? undefined,
    twinName: row.twin_name ?? undefined,
    type: row.notification_type,
    bookId: row.book_id ?? undefined,
    bookTitle: row.book_title ?? undefined,
    forumId: row.forum_id ?? undefined,
    message: row.message,
    feedback: row.feedback ?? undefined,
    read: row.is_read,
    createdAt: toMillis(row.created_at),
  };
}

function resolveMasterIdentifier(row: TwinRow) {
  return row.auth_user_id ?? row.master_email ?? row.legacy_master_id ?? null;
}

function serializeTwinProfile(row: TwinRow): TwinProfileRecord | null {
  const masterId = resolveMasterIdentifier(row);

  return {
    _id: row.id,
    masterId: masterId ?? undefined,
    name: row.name,
    specialization: row.specialization ?? undefined,
    sourcePlatform: row.source_platform,
    trainingStatus: row.training_status,
    knowledgeScore: row.knowledge_score,
    isActive: row.is_active,
    taskCount: row.task_count,
    lifecycleState: row.lifecycle_state,
    verificationBadge: row.verification_badge,
    trustScore: row.trust_score,
    publishedCount: row.published_count,
    followersCount: row.followers_count,
    allowedSkills: normalizeStringArray(row.allowed_skills),
    blockedSkills: normalizeStringArray(row.blocked_skills),
    approvalRequiredActions: normalizeStringArray(row.approval_required_actions),
    masterAuthUserId: row.auth_user_id ?? undefined,
    masterEmail: row.master_email ?? undefined,
    masterName: row.master_name ?? undefined,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

export type TwinKeyRecord = {
  id: string;
  masterId: string;
  masterAuthUserId?: string;
  masterEmail?: string;
  masterName?: string;
  name: string;
  lifecycleState: string;
  allowedSkills: string[];
  blockedSkills: string[];
  approvalRequiredActions: string[];
};

export type TwinProfileRecord = {
  _id: string;
  masterId?: string;
  name: string;
  specialization?: string;
  sourcePlatform: string;
  trainingStatus: string;
  knowledgeScore: number;
  isActive: boolean;
  taskCount: number;
  lifecycleState: string;
  verificationBadge: boolean;
  trustScore: number;
  publishedCount: number;
  followersCount: number;
  allowedSkills: string[];
  blockedSkills: string[];
  approvalRequiredActions: string[];
  masterAuthUserId?: string;
  masterEmail?: string;
  masterName?: string;
  createdAt: number;
  updatedAt: number;
};

type TwinActivityRow = {
  id: string;
  twin_id: string;
  master_identifier: string | null;
  action: string;
  target_resource: string | null;
  metadata: Record<string, string> | null;
  timestamp_ms: string | number;
};

export async function getTwinByKeyHash(keyHash: string): Promise<TwinKeyRecord | null> {
  const result = await insforgeQuery<TwinRow>(
    `
      select
        id,
        auth_user_id,
        legacy_master_id,
        name,
        specialization,
        source_platform,
        training_status,
        knowledge_score,
        is_active,
        task_count,
        lifecycle_state,
        verification_badge,
        trust_score,
        published_count,
        followers_count,
        allowed_skills,
        blocked_skills,
        approval_required_actions,
        master_email,
        master_name,
        created_at,
        updated_at
      from public.twins
      where api_key_hash = $1
      limit 1
    `,
    [keyHash],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const masterId = resolveMasterIdentifier(row);
  if (!masterId) {
    return null;
  }

  return {
    id: row.id,
    masterId,
    masterAuthUserId: row.auth_user_id ?? undefined,
    masterEmail: row.master_email ?? undefined,
    masterName: row.master_name ?? undefined,
    name: row.name,
    lifecycleState: row.lifecycle_state,
    allowedSkills: normalizeStringArray(row.allowed_skills),
    blockedSkills: normalizeStringArray(row.blocked_skills),
    approvalRequiredActions: normalizeStringArray(row.approval_required_actions),
  };
}

export async function getTwinProfileByKeyHash(keyHash: string) {
  const result = await insforgeQuery<TwinRow>(
    `
      select
        id,
        auth_user_id,
        legacy_master_id,
        name,
        specialization,
        source_platform,
        training_status,
        knowledge_score,
        is_active,
        task_count,
        lifecycle_state,
        verification_badge,
        trust_score,
        published_count,
        followers_count,
        allowed_skills,
        blocked_skills,
        approval_required_actions,
        master_email,
        master_name,
        created_at,
        updated_at
      from public.twins
      where api_key_hash = $1
      limit 1
    `,
    [keyHash],
  );

  const row = result.rows[0];
  return row ? serializeTwinProfile(row) : null;
}

export async function getTwinByMasterId(masterId: string) {
  const result = await insforgeQuery<TwinRow>(
    `
      select
        id,
        auth_user_id,
        legacy_master_id,
        name,
        specialization,
        source_platform,
        training_status,
        knowledge_score,
        is_active,
        task_count,
        lifecycle_state,
        verification_badge,
        trust_score,
        published_count,
        followers_count,
        allowed_skills,
        blocked_skills,
        approval_required_actions,
        master_email,
        master_name,
        created_at,
        updated_at
      from public.twins
      where auth_user_id::text = $1
         or legacy_master_id = $1
         or master_email = $1
      order by updated_at desc
      limit 1
    `,
    [masterId],
  );

  const row = result.rows[0];
  return row ? serializeTwinProfile(row) : null;
}

export async function createTwinNotification(args: {
  masterId: string;
  masterAuthUserId?: string;
  twinId?: string;
  twinName?: string;
  type: TwinNotificationType;
  bookId?: string;
  bookTitle?: string;
  forumId?: string;
  message: string;
  feedback?: string;
}) {
  const result = await insforgeQuery<TwinNotificationRow>(
    `
      insert into public.twin_notifications (
        master_auth_user_id,
        master_identifier,
        twin_id,
        twin_name,
        notification_type,
        book_id,
        book_title,
        forum_id,
        message,
        feedback
      )
      values (
        $1::uuid,
        $2,
        $3::uuid,
        $4,
        $5,
        $6::uuid,
        $7,
        $8,
        $9,
        $10
      )
      returning
        id,
        master_auth_user_id,
        master_identifier,
        twin_id,
        twin_name,
        notification_type,
        book_id,
        book_title,
        forum_id,
        message,
        feedback,
        is_read,
        created_at
    `,
    [
      args.masterAuthUserId ?? null,
      args.masterId,
      args.twinId ?? null,
      args.twinName ?? null,
      args.type,
      args.bookId ?? null,
      args.bookTitle ?? null,
      args.forumId ?? null,
      args.message,
      args.feedback ?? null,
    ],
  );

  return serializeTwinNotification(result.rows[0]);
}

export async function listTwinNotificationsForMaster(masterId: string) {
  const result = await insforgeQuery<TwinNotificationRow>(
    `
      select
        id,
        master_auth_user_id,
        master_identifier,
        twin_id,
        twin_name,
        notification_type,
        book_id,
        book_title,
        forum_id,
        message,
        feedback,
        is_read,
        created_at
      from public.twin_notifications
      where master_identifier = $1
      order by created_at desc
      limit 50
    `,
    [masterId],
  );

  return result.rows.map(serializeTwinNotification);
}

export async function markTwinNotificationsReadForMaster(args: {
  masterId: string;
  notificationIds?: string[];
}) {
  const params: unknown[] = [args.masterId];
  let notificationFilter = "";

  if (args.notificationIds && args.notificationIds.length > 0) {
    params.push(args.notificationIds);
    notificationFilter = `and id = any($2::uuid[])`;
  }

  const result = await insforgeQuery<QueryResultRow>(
    `
      update public.twin_notifications
      set
        is_read = true,
        updated_at = now()
      where master_identifier = $1
        and is_read = false
        ${notificationFilter}
    `,
    params,
  );

  return { updatedCount: result.rowCount ?? 0 };
}

export async function logTwinActivity(args: {
  twinId: string;
  masterId?: string;
  action: string;
  targetResource?: string;
  metadata?: Record<string, string | undefined>;
}) {
  const filteredMetadata = Object.fromEntries(
    Object.entries(args.metadata ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const result = await insforgeQuery<TwinActivityRow>(
    `
      insert into public.twin_activity_log (
        twin_id,
        master_identifier,
        action,
        target_resource,
        metadata,
        timestamp_ms
      )
      values ($1::uuid, $2, $3, $4, $5::jsonb, $6::bigint)
      returning
        id,
        twin_id,
        master_identifier,
        action,
        target_resource,
        metadata,
        timestamp_ms
    `,
    [
      args.twinId,
      args.masterId ?? null,
      args.action,
      args.targetResource ?? null,
      JSON.stringify(filteredMetadata),
      Date.now(),
    ],
  );

  return result.rows[0];
}
