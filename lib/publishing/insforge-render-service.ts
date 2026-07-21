import type { QueryResultRow } from "pg";
import { insforgeQuery } from "@/lib/insforge-db";

export type RenderJobStatus = "queued" | "processing" | "completed" | "failed";

type RenderJobRow = {
  id: string;
  build_id: string;
  requester_identifier: string | null;
  status: RenderJobStatus;
  content: string | null;
  pdf_url: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toMillis(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export type RenderJobRecord = {
  buildId: string;
  userId?: string;
  status: RenderJobStatus;
  content?: string;
  pdfUrl?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function serializeRenderJob(row: RenderJobRow): RenderJobRecord {
  return {
    buildId: row.build_id,
    userId: row.requester_identifier ?? undefined,
    status: row.status,
    content: row.content ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    error: row.error ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: new Date(toMillis(row.created_at)).toISOString(),
    updatedAt: new Date(toMillis(row.updated_at)).toISOString(),
  };
}

export async function createRenderJob(args: {
  buildId: string;
  userId?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await insforgeQuery<RenderJobRow>(
    `
      insert into public.book_render_jobs (
        build_id,
        requester_identifier,
        status,
        content,
        metadata
      )
      values ($1, $2, 'queued', $3, $4::jsonb)
      on conflict (build_id)
      do update set
        requester_identifier = excluded.requester_identifier,
        content = excluded.content,
        metadata = excluded.metadata,
        updated_at = now()
      returning
        id,
        build_id,
        requester_identifier,
        status,
        content,
        pdf_url,
        error,
        metadata,
        created_at,
        updated_at
    `,
    [
      args.buildId,
      args.userId ?? null,
      args.content ?? null,
      JSON.stringify(args.metadata ?? {}),
    ],
  );

  return serializeRenderJob(result.rows[0]);
}

export async function updateRenderJob(args: {
  buildId: string;
  status?: RenderJobStatus;
  pdfUrl?: string;
  error?: string;
}) {
  const updates: string[] = ["updated_at = now()"];
  const params: unknown[] = [args.buildId];
  let paramIndex = 2;

  if (args.status) {
    updates.push(`status = $${paramIndex}`);
    params.push(args.status);
    paramIndex += 1;
  }

  if (args.pdfUrl !== undefined) {
    updates.push(`pdf_url = $${paramIndex}`);
    params.push(args.pdfUrl ?? null);
    paramIndex += 1;
  }

  if (args.error !== undefined) {
    updates.push(`error = $${paramIndex}`);
    params.push(args.error ?? null);
    paramIndex += 1;
  }

  const result = await insforgeQuery<RenderJobRow>(
    `
      update public.book_render_jobs
      set ${updates.join(", ")}
      where build_id = $1
      returning
        id,
        build_id,
        requester_identifier,
        status,
        content,
        pdf_url,
        error,
        metadata,
        created_at,
        updated_at
    `,
    params,
  );

  return result.rows[0] ? serializeRenderJob(result.rows[0]) : undefined;
}

export async function getRenderJobByBuildId(buildId: string) {
  const result = await insforgeQuery<RenderJobRow>(
    `
      select
        id,
        build_id,
        requester_identifier,
        status,
        content,
        pdf_url,
        error,
        metadata,
        created_at,
        updated_at
      from public.book_render_jobs
      where build_id = $1
      limit 1
    `,
    [buildId],
  );

  return result.rows[0] ? serializeRenderJob(result.rows[0]) : undefined;
}

export async function purgeOldRenderJobs(olderThanMs: number) {
  const result = await insforgeQuery<QueryResultRow>(
    `
      delete from public.book_render_jobs
      where created_at < now() - ($1 || ' milliseconds')::interval
    `,
    [String(olderThanMs)],
  );

  return { deleted: result.rowCount ?? 0 };
}
