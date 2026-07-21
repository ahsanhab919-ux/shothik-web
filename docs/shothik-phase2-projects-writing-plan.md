# Shothik Phase 2 Migration Plan

Date: `2026-07-17`
Status: `Launched`
Primary slice: `Projects and writing persistence`

## Goal

Launch the first non-book migration slice after Books Phase 1 by moving project
and writing-studio persistence from Convex to InsForge-backed schema, services,
and API routes.

## Why This Is Phase 2

The backend migration roadmap ranks `Projects and writing persistence` as the
next non-book slice after the completed Books Phase 1 launch path because:

1. it is the next bounded user-facing authoring module
2. it can be partially decoupled from Books through `legacy_project_id`
3. it reduces the largest remaining Convex dependency inside the writing studio
4. it creates the persistence foundation needed before broader commerce, Twin,
   and community waves

## Scope

Phase 2 includes:

- project list, get, create, update, delete
- project content save and resume
- project settings persistence
- project version save, list, and restore
- project stats reads used by the writing studio
- ownership and RLS enforcement for project records

Phase 2 excludes:

- Twin and Second Me persistence
- forums, channels, voting, and reputation
- subscription normalization and payout logic
- external publishing distribution, ISBN, LaTeX, and revenue reconciliation

## Source Modules

Primary legacy source:

- [projects.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/projects.ts)

Primary app consumers:

- [useProjectsStore.ts](file:///Users/user/Pictures/shothik.2/shothik-web/hooks/useProjectsStore.ts)
- [IntegratedWritingStudio.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/IntegratedWritingStudio.tsx)
- [ProjectContainer.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/containers/ProjectContainer.tsx)
- [RightPanel.tsx](file:///Users/user/Pictures/shothik.2/shothik-web/components/writing-studio/layout/RightPanel.tsx)

## Target Architecture

### Database

Planned tables:

- `public.projects`
- `public.project_versions`

Planned ownership model:

- canonical owner: `auth_user_id uuid references auth.users(id)`
- legacy bridge: optional `legacy_convex_id text unique`
- optional linkage back to Books through nullable project references only

### Service Layer

Planned server modules:

- `lib/projects/insforge-project-service.ts`
- `lib/projects/http.ts`

Core responsibilities:

- create/list/get projects
- patch metadata, content, and settings
- save versions and restore versions
- compute lightweight project stats
- centralize ownership and editability guards

### API Surface

Planned routes:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`
- `POST /api/projects/[id]/content`
- `POST /api/projects/[id]/settings`
- `GET /api/projects/[id]/stats`
- `GET /api/projects/[id]/versions`
- `POST /api/projects/[id]/versions`
- `POST /api/projects/[id]/versions/[versionId]/restore`

### UI Cutover Targets

Priority order:

1. `hooks/useProjectsStore.ts`
2. `components/writing-studio/containers/ProjectContainer.tsx`
3. `components/writing-studio/IntegratedWritingStudio.tsx`
4. `components/writing-studio/layout/RightPanel.tsx`

## Dependencies

Hard dependencies:

- InsForge auth remains the canonical owner identity source
- Books Phase 1 stays stable because project references remain nullable
- local/staging envs must expose `DATABASE_URL`, `NEXT_PUBLIC_INSFORGE_URL`, and
  `NEXT_PUBLIC_INSFORGE_ANON_KEY`

Soft dependencies:

- a versioned migration naming convention consistent with Books Phase 1
- the current creator-facing writing studio payload shapes remain stable during
  cutover

## Risks And Responses

| Risk | Impact | Response |
| --- | --- | --- |
| writing studio payloads are larger and more nested than book draft payloads | save/resume regressions | start with stable JSONB payload compatibility and preserve current client shape |
| local fallback projects and Convex projects diverge | inconsistent UI behavior | keep one compatibility adapter in `useProjectsStore.ts` until the InsForge path is verified |
| version restore semantics drift | authoring data loss | port `saveVersion`, `getVersions`, and `restoreVersion` together as one slice |
| project-to-book relationships harden too early | books regression | keep `source_project_id` nullable and preserve `legacy_project_id` during cutover |

## Execution Plan

### Step 1: Data model

- define `public.projects`
- define `public.project_versions`
- add indexes for owner and last-edited sorting
- add owner/admin RLS and grants

### Step 2: Service port

- port list/get/create/update/remove
- port content save
- port settings merge
- port stats calculation
- port version save/list/restore

### Step 3: HTTP shell

- create `/api/projects*` route family
- reuse `getAuthenticatedUser()` and consistent JSON error contracts

### Step 4: UI migration

- switch `useProjectsStore.ts` from Convex to REST
- migrate writing-studio containers that still call `api.projects.*`
- remove project-specific Convex hooks only after parity validation passes

### Step 5: Validation

- unit tests for owner guards and payload normalization
- integration tests for project lifecycle and version restore
- focused browser smoke on create, save, reopen, version, and delete

## Kickoff Deliverables

The Phase 2 kickoff is complete when the repo contains:

1. this plan document
2. delivery tracker updates naming `Projects and writing persistence` as the
   next active backend slice
3. a prepared seed/smoke status report for R&D follow-up from the completed
   Books Phase 1 staging attempt

## Next Commandable Work

Immediate implementation target:

- inspect `convex/projects.ts` field semantics and map them into an InsForge SQL
  migration plus `lib/projects/insforge-project-service.ts`

Deferred adjacent wave:

- books publishing ops:
  - PublishDrive
  - ISBN
  - LaTeX/export
  - distribution webhook reconciliation
