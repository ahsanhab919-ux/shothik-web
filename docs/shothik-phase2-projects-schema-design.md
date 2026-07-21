# Phase 2 Projects Schema Design

Date: `2026-07-17`
Status: `Drafted for implementation`

## Source Of Truth

Legacy source module:

- [projects.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/projects.ts)

Legacy schema definitions:

- [schema.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/schema.ts)

Primary client consumers:

- [useProjectsStore.ts](file:///Users/user/Pictures/shothik.2/shothik-web/hooks/useProjectsStore.ts)
- [IntegratedWritingStudio.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/IntegratedWritingStudio.tsx)
- [ProjectContainer.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/containers/ProjectContainer.tsx)
- [RightPanel.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/layout/RightPanel.tsx)

## Table Plan

### `public.projects`

Purpose:

- canonical owner-scoped project record for the writing studio

Proposed columns:

- `id uuid primary key default gen_random_uuid()`
- `legacy_convex_id text unique`
- `auth_user_id uuid not null references auth.users(id) on delete cascade`
- `type text not null check (type in ('book','research','assignment'))`
- `title text not null`
- `template text`
- `description text`
- `content text not null default ''`
- `sections jsonb not null default '[]'::jsonb`
- `settings jsonb not null default '{}'::jsonb`
- `research_notes jsonb`
- `agent_chapters jsonb`
- `word_count integer not null default 0 check (word_count >= 0)`
- `progress integer not null default 0 check (progress >= 0 and progress <= 100)`
- `starred boolean not null default false`
- `last_edited_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `(auth_user_id, last_edited_at desc)`
- `(auth_user_id, type, last_edited_at desc)`
- `(type, last_edited_at desc)`

### `public.project_versions`

Purpose:

- append-only version history used by restore and side-panel history

Proposed columns:

- `id uuid primary key default gen_random_uuid()`
- `project_id uuid not null references public.projects(id) on delete cascade`
- `auth_user_id uuid not null references auth.users(id) on delete cascade`
- `content text not null`
- `sections jsonb`
- `label text`
- `saved_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Indexes:

- `(project_id, saved_at desc)`
- `(auth_user_id, saved_at desc)`

## Ownership Model

Canonical owner key:

- `auth_user_id uuid`

Compatibility fields:

- `legacy_convex_id text unique` for backfill traceability

RLS rules:

- owners can `select`, `insert`, `update`, `delete` their own `projects`
- owners can `select`, `insert` their own `project_versions`
- admins may read for support only if Phase 2 needs it; default implementation
  can stay owner-only

## JSON Compatibility Strategy

To avoid a flag day in writing-studio clients:

- preserve `sections` as JSONB with the current nested shape
- preserve `settings` as JSONB with the current optional fields
- preserve `researchNotes` as JSONB so planner-generated notes survive the authenticated path
- preserve `agentChapters` as JSONB so generated outlines render after reload and version actions
- expose API payloads that still resemble the current client expectations:
  - `_id`
  - `title`
  - `type`
  - `template`
  - `description`
  - `content`
  - `sections`
  - `settings`
  - `researchNotes`
  - `agentChapters`
  - `wordCount`
  - `progress`
  - `starred`
  - `lastEditedAt`

## Route Mapping

Legacy behavior to port:

- `list` -> `GET /api/projects`
- `get` -> `GET /api/projects/[id]`
- `create` -> `POST /api/projects`
- `update` -> `PATCH /api/projects/[id]`
- `updateContent` -> `POST /api/projects/[id]/content`
- `updateSettings` -> `POST /api/projects/[id]/settings`
- `getStats` -> `GET /api/projects/[id]/stats`
- `saveVersion` -> `POST /api/projects/[id]/versions`
- `getVersions` -> `GET /api/projects/[id]/versions`
- `restoreVersion` -> `POST /api/projects/[id]/versions/[versionId]/restore`
- `remove` -> `DELETE /api/projects/[id]`

## Migration Notes

Books integration:

- keep `books.source_project_id` nullable
- keep `books.legacy_project_id` for transitional references
- do not block Books flows while project migration is in progress

Local fallback:

- `useProjectsStore.ts` currently mixes authenticated Convex persistence with
  unauthenticated local-storage persistence
- Phase 2 should preserve the local-storage fallback for unauthenticated users
  and only replace the authenticated branch

## First Implementation Targets

1. SQL migration for `public.projects` and `public.project_versions`
2. `lib/projects/insforge-project-service.ts`
3. `app/api/projects/route.ts`
4. `app/api/projects/[id]/route.ts`
5. `hooks/useProjectsStore.ts` authenticated branch cutover
