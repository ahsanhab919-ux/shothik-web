import type { PoolClient, QueryResultRow } from "pg";
import { insforgeQuery, withInsforgeTransaction } from "@/lib/insforge-db";

export class InsforgeProjectServiceError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_REQUEST" | "CONFLICT";

  constructor(
    code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_REQUEST" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export type ProjectType = "book" | "research" | "assignment";

type ProjectRow = {
  id: string;
  legacy_convex_id: string | null;
  auth_user_id: string;
  type: ProjectType;
  title: string;
  template: string | null;
  description: string | null;
  content: string;
  sections: unknown[];
  settings: Record<string, unknown>;
  word_count: number;
  progress: number;
  starred: boolean;
  research_notes: Record<string, unknown> | null;
  agent_chapters: unknown[] | null;
  last_edited_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProjectVersionRow = {
  id: string;
  project_id: string;
  auth_user_id: string;
  content: string;
  sections: unknown[] | null;
  label: string | null;
  saved_at: Date | string;
  created_at: Date | string;
};

type ProjectStatsRow = {
  total_versions: string | number;
  first_saved_at: Date | string | null;
  latest_saved_at: Date | string | null;
};

export type CreateProjectInput = {
  userId: string;
  title: string;
  type: ProjectType;
  template?: string | null;
  description?: string | null;
  content?: string;
  sections?: unknown[];
  settings?: Record<string, unknown>;
  researchNotes?: Record<string, unknown> | null;
  agentChapters?: unknown[] | null;
};

export type UpdateProjectInput = {
  projectId: string;
  userId: string;
  updates: {
    title?: string;
    template?: string | null;
    description?: string | null;
    content?: string;
    sections?: unknown[];
    settings?: Record<string, unknown>;
    wordCount?: number;
    progress?: number;
    starred?: boolean;
    researchNotes?: Record<string, unknown> | null;
    agentChapters?: unknown[] | null;
  };
};

export type UpdateProjectContentInput = {
  projectId: string;
  userId: string;
  content: string;
  sections?: unknown[];
  wordCount?: number;
};

export type UpdateProjectSettingsInput = {
  projectId: string;
  userId: string;
  settings: Record<string, unknown>;
};

export type SaveProjectVersionInput = {
  projectId: string;
  userId: string;
  content: string;
  sections?: unknown[];
  label?: string | null;
};

function toMillis(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function countWords(content: string) {
  return content
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function toSerializedProject(row: ProjectRow) {
  return {
    _id: row.id,
    userId: row.auth_user_id,
    legacyConvexId: row.legacy_convex_id ?? undefined,
    title: row.title,
    type: row.type,
    template: row.template,
    description: row.description ?? "",
    content: row.content,
    sections: row.sections ?? [],
    settings: row.settings ?? {},
    wordCount: row.word_count,
    progress: row.progress,
    starred: row.starred,
    researchNotes: row.research_notes ?? null,
    agentChapters: row.agent_chapters ?? null,
    lastEditedAt: toMillis(row.last_edited_at),
    _creationTime: toMillis(row.created_at),
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function toSerializedProjectVersion(row: ProjectVersionRow) {
  return {
    _id: row.id,
    projectId: row.project_id,
    userId: row.auth_user_id,
    content: row.content,
    sections: row.sections ?? [],
    label: row.label ?? "",
    savedAt: toMillis(row.saved_at),
    _creationTime: toMillis(row.created_at),
  };
}

async function runQuery<T extends QueryResultRow>(
  client: PoolClient | null,
  text: string,
  params: unknown[],
) {
  if (client) {
    return client.query<T>(text, params);
  }
  return insforgeQuery<T>(text, params);
}

async function requireProjectAccess(
  projectId: string,
  userId: string,
  client: PoolClient | null = null,
) {
  const result = await runQuery<ProjectRow>(
    client,
    `
      select
        id,
        legacy_convex_id,
        auth_user_id,
        type,
        title,
        template,
        description,
        content,
        sections,
        settings,
        word_count,
        progress,
        starred,
        research_notes,
        agent_chapters,
        last_edited_at,
        created_at,
        updated_at
      from public.projects
      where id = $1
      limit 1
    `,
    [projectId],
  );

  const project = result.rows[0];
  if (!project) {
    throw new InsforgeProjectServiceError("NOT_FOUND", "Project not found.");
  }
  if (project.auth_user_id !== userId) {
    throw new InsforgeProjectServiceError("FORBIDDEN", "Project access denied.");
  }

  return project;
}

function normalizeTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    throw new InsforgeProjectServiceError("INVALID_REQUEST", "Project title is required.");
  }
  if (normalized.length > 200) {
    throw new InsforgeProjectServiceError(
      "INVALID_REQUEST",
      "Project title must be 200 characters or fewer.",
    );
  }
  return normalized;
}

function normalizeDescription(description?: string | null) {
  if (description == null) return null;
  const normalized = description.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeWordCount(content: string, wordCount?: number) {
  if (typeof wordCount === "number") {
    if (!Number.isInteger(wordCount) || wordCount < 0) {
      throw new InsforgeProjectServiceError(
        "INVALID_REQUEST",
        "wordCount must be a non-negative integer.",
      );
    }
    return wordCount;
  }
  return countWords(content);
}

function normalizeProgress(progress?: number) {
  if (typeof progress !== "number") return undefined;
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new InsforgeProjectServiceError(
      "INVALID_REQUEST",
      "progress must be an integer between 0 and 100.",
    );
  }
  return progress;
}

export async function listProjectsForUser(userId: string, type?: ProjectType) {
  const params: unknown[] = [userId];
  let filterSql = "";

  if (type) {
    params.push(type);
    filterSql = "and type = $2";
  }

  const result = await insforgeQuery<ProjectRow>(
    `
      select
        id,
        legacy_convex_id,
        auth_user_id,
        type,
        title,
        template,
        description,
        content,
        sections,
        settings,
        word_count,
        progress,
        starred,
        research_notes,
        agent_chapters,
        last_edited_at,
        created_at,
        updated_at
      from public.projects
      where auth_user_id = $1
      ${filterSql}
      order by last_edited_at desc, created_at desc
    `,
    params,
  );

  return result.rows.map(toSerializedProject);
}

export async function getProjectForUser(projectId: string, userId: string) {
  const project = await requireProjectAccess(projectId, userId);
  return toSerializedProject(project);
}

export async function createProjectForUser(input: CreateProjectInput) {
  const content = input.content ?? "";
  const wordCount = normalizeWordCount(content);
  const result = await insforgeQuery<ProjectRow>(
    `
      insert into public.projects (
        auth_user_id,
        type,
        title,
        template,
        description,
        content,
        sections,
        settings,
        word_count,
        progress,
        starred,
        research_notes,
        agent_chapters,
        last_edited_at
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, false, $11::jsonb, $12::jsonb, now())
      returning
        id,
        legacy_convex_id,
        auth_user_id,
        type,
        title,
        template,
        description,
        content,
        sections,
        settings,
        word_count,
        progress,
        starred,
        research_notes,
        agent_chapters,
        last_edited_at,
        created_at,
        updated_at
    `,
    [
      input.userId,
      input.type,
      normalizeTitle(input.title),
      input.template?.trim() || null,
      normalizeDescription(input.description),
      content,
      JSON.stringify(input.sections ?? []),
      JSON.stringify(input.settings ?? {}),
      wordCount,
      0,
      input.researchNotes ? JSON.stringify(input.researchNotes) : null,
      input.agentChapters ? JSON.stringify(input.agentChapters) : null,
    ],
  );

  return toSerializedProject(result.rows[0]);
}

export async function updateProjectForUser(input: UpdateProjectInput) {
  return withInsforgeTransaction(async (client) => {
    const current = await requireProjectAccess(input.projectId, input.userId, client);
    const fields: string[] = [];
    const values: unknown[] = [];

    const push = (sql: string, value: unknown) => {
      values.push(value);
      fields.push(`${sql} = $${values.length}`);
    };

    if (input.updates.title !== undefined) {
      push("title", normalizeTitle(input.updates.title));
    }
    if (input.updates.template !== undefined) {
      push("template", input.updates.template?.trim() || null);
    }
    if (input.updates.description !== undefined) {
      push("description", normalizeDescription(input.updates.description));
    }
    if (input.updates.content !== undefined) {
      push("content", input.updates.content);
      push("word_count", normalizeWordCount(input.updates.content, input.updates.wordCount));
    } else if (input.updates.wordCount !== undefined) {
      push("word_count", normalizeWordCount(current.content, input.updates.wordCount));
    }
    if (input.updates.sections !== undefined) {
      push("sections", JSON.stringify(input.updates.sections));
      fields[fields.length - 1] = `sections = $${values.length}::jsonb`;
    }
    if (input.updates.settings !== undefined) {
      push("settings", JSON.stringify(input.updates.settings));
      fields[fields.length - 1] = `settings = $${values.length}::jsonb`;
    }
    if (input.updates.progress !== undefined) {
      push("progress", normalizeProgress(input.updates.progress));
    }
    if (input.updates.starred !== undefined) {
      push("starred", input.updates.starred);
    }
    if (input.updates.researchNotes !== undefined) {
      push("research_notes", input.updates.researchNotes ? JSON.stringify(input.updates.researchNotes) : null);
      fields[fields.length - 1] = `research_notes = $${values.length}::jsonb`;
    }
    if (input.updates.agentChapters !== undefined) {
      push("agent_chapters", input.updates.agentChapters ? JSON.stringify(input.updates.agentChapters) : null);
      fields[fields.length - 1] = `agent_chapters = $${values.length}::jsonb`;
    }

    if (fields.length === 0) {
      return toSerializedProject(current);
    }

    fields.push("last_edited_at = now()");
    values.push(input.projectId);

    const result = await client.query<ProjectRow>(
      `
        update public.projects
        set ${fields.join(", ")}
        where id = $${values.length}
        returning
          id,
          legacy_convex_id,
          auth_user_id,
          type,
          title,
          template,
          description,
          content,
          sections,
          settings,
          word_count,
          progress,
          starred,
          research_notes,
          agent_chapters,
          last_edited_at,
          created_at,
          updated_at
      `,
      values,
    );

    return toSerializedProject(result.rows[0]);
  });
}

export async function updateProjectContentForUser(input: UpdateProjectContentInput) {
  const updated = await updateProjectForUser({
    projectId: input.projectId,
    userId: input.userId,
    updates: {
      content: input.content,
      sections: input.sections,
      wordCount: input.wordCount,
    },
  });

  return {
    success: true,
    savedAt: updated.lastEditedAt,
    project: updated,
  };
}

export async function updateProjectSettingsForUser(input: UpdateProjectSettingsInput) {
  return withInsforgeTransaction(async (client) => {
    const current = await requireProjectAccess(input.projectId, input.userId, client);
    const mergedSettings = {
      ...(current.settings ?? {}),
      ...(input.settings ?? {}),
    };

    const result = await client.query<ProjectRow>(
      `
        update public.projects
        set settings = $1::jsonb, last_edited_at = now()
        where id = $2
        returning
          id,
          legacy_convex_id,
          auth_user_id,
          type,
          title,
          template,
          description,
          content,
          sections,
          settings,
          word_count,
          progress,
          starred,
          research_notes,
          agent_chapters,
          last_edited_at,
          created_at,
          updated_at
      `,
      [JSON.stringify(mergedSettings), input.projectId],
    );

    return toSerializedProject(result.rows[0]);
  });
}

export async function getProjectStatsForUser(projectId: string, userId: string) {
  const project = await requireProjectAccess(projectId, userId);
  const versionsResult = await insforgeQuery<ProjectStatsRow>(
    `
      select
        count(*)::bigint as total_versions,
        min(saved_at) as first_saved_at,
        max(saved_at) as latest_saved_at
      from public.project_versions
      where project_id = $1 and auth_user_id = $2
    `,
    [projectId, userId],
  );

  const stats = versionsResult.rows[0];
  const totalVersions = Number(stats?.total_versions ?? 0);
  const wordsWritten = project.word_count ?? 0;
  const targetWords =
    project.type === "research"
      ? 8_000
      : project.type === "assignment"
        ? 3_000
        : 80_000;
  const progress = Math.min(100, Math.round((wordsWritten / Math.max(1, targetWords)) * 100));
  const firstSavedAt = stats?.first_saved_at ? toMillis(stats.first_saved_at) : project.created_at ? toMillis(project.created_at) : Date.now();
  const daysSinceStart = Math.max(1, Math.floor((Date.now() - firstSavedAt) / 86_400_000));
  const velocity = Math.round(wordsWritten / daysSinceStart);
  const remainingWords = Math.max(0, targetWords - wordsWritten);
  const estimatedDays = velocity > 0 ? Math.ceil(remainingWords / velocity) : null;

  return {
    totalVersions,
    wordsWritten,
    targetWords,
    progress,
    velocity,
    estimatedDays,
    lastEdited: toMillis(project.last_edited_at),
  };
}

export async function saveProjectVersionForUser(input: SaveProjectVersionInput) {
  await requireProjectAccess(input.projectId, input.userId);

  const result = await insforgeQuery<ProjectVersionRow>(
    `
      insert into public.project_versions (
        project_id,
        auth_user_id,
        content,
        sections,
        label
      )
      values ($1, $2, $3, $4::jsonb, $5)
      returning
        id,
        project_id,
        auth_user_id,
        content,
        sections,
        label,
        saved_at,
        created_at
    `,
    [
      input.projectId,
      input.userId,
      input.content,
      JSON.stringify(input.sections ?? []),
      input.label?.trim() || null,
    ],
  );

  return toSerializedProjectVersion(result.rows[0]);
}

export async function listProjectVersionsForUser(projectId: string, userId: string, limit = 20) {
  await requireProjectAccess(projectId, userId);
  const result = await insforgeQuery<ProjectVersionRow>(
    `
      select
        id,
        project_id,
        auth_user_id,
        content,
        sections,
        label,
        saved_at,
        created_at
      from public.project_versions
      where project_id = $1 and auth_user_id = $2
      order by saved_at desc, created_at desc
      limit $3
    `,
    [projectId, userId, limit],
  );

  return result.rows.map(toSerializedProjectVersion);
}

export async function restoreProjectVersionForUser(projectId: string, versionId: string, userId: string) {
  return withInsforgeTransaction(async (client) => {
    await requireProjectAccess(projectId, userId, client);

    const versionResult = await client.query<ProjectVersionRow>(
      `
        select
          id,
          project_id,
          auth_user_id,
          content,
          sections,
          label,
          saved_at,
          created_at
        from public.project_versions
        where id = $1 and project_id = $2 and auth_user_id = $3
        limit 1
      `,
      [versionId, projectId, userId],
    );

    const version = versionResult.rows[0];
    if (!version) {
      throw new InsforgeProjectServiceError("NOT_FOUND", "Project version not found.");
    }

    const restoredWordCount = normalizeWordCount(version.content);
    const updateResult = await client.query<ProjectRow>(
      `
        update public.projects
        set
          content = $1,
          sections = $2::jsonb,
          word_count = $3,
          last_edited_at = now()
        where id = $4
        returning
          id,
          legacy_convex_id,
          auth_user_id,
          type,
          title,
          template,
          description,
          content,
          sections,
          settings,
          word_count,
          progress,
          starred,
          research_notes,
          agent_chapters,
          last_edited_at,
          created_at,
          updated_at
      `,
      [version.content, JSON.stringify(version.sections ?? []), restoredWordCount, projectId],
    );

    await client.query(
      `
        insert into public.project_versions (
          project_id,
          auth_user_id,
          content,
          sections,
          label
        )
        values ($1, $2, $3, $4::jsonb, $5)
      `,
      [
        projectId,
        userId,
        version.content,
        JSON.stringify(version.sections ?? []),
        `Restored ${version.label?.trim() || version.id.slice(0, 8)}`,
      ],
    );

    return toSerializedProject(updateResult.rows[0]);
  });
}

export async function deleteProjectForUser(projectId: string, userId: string) {
  await requireProjectAccess(projectId, userId);
  await insforgeQuery(
    `
      delete from public.projects
      where id = $1 and auth_user_id = $2
    `,
    [projectId, userId],
  );

  return { success: true };
}
