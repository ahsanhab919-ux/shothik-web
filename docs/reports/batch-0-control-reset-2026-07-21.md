# Batch 0 Control Reset Report

Date: `2026-07-21`

## Objective

Reset the active delivery controls so the repo can advance through a strict
batch sequence toward end-to-end operation across auth/runtime, native tools,
agent systems, and the full writing-to-publishing workflow.

## Completed In This Batch

1. Re-audited the codebase and delivery artifacts across:
   - auth and runtime connectivity
   - native tools and MCP runtime paths
   - agent-system execution paths
   - writing and publishing workflow continuity
2. Sanitized tracked InsForge linkage metadata:
   - `.insforge/project.json`
   - `.insforge/project.parent.json`
3. Updated control documents to reflect the active program state:
   - `docs/delivery/current-execution-plan.md`
   - `docs/delivery/current-progress-log.md`
   - `docs/delivery/current-milestones.md`
4. Updated configuration guidance so tracked InsForge linkage files are treated
   as non-secret metadata only:
   - `docs/ENVIRONMENT_VARIABLES.md`
   - `docs/project-platform-setup.md`

## Current Active Batch Sequence

1. Batch 0: Stabilization and control gate
2. Batch 1: Auth and runtime foundation
3. Batch 2: Native tool runtime enablement
4. Batch 3: Agent-system unification
5. Batch 4: Writing workflow consolidation
6. Batch 5: Publishing workflow completion
7. Batch 6: End-to-end certification and release readiness

## Active Blockers

### Batch 1 blockers

- staging `DATABASE_URL` does not yet match the active InsForge project lineage
  required by `/api/projects`
- localhost Google OAuth callback still does not establish durable app-domain
  session persistence after `insforge_code` exchange

### Support-lane blocker

- GitHub delivery-tracker sync remains blocked on write-capable token
  permissions

## Security Note

Tracked InsForge project linkage files must not retain committed API keys. If a
developer needs refreshed local CLI access, they must relink or authenticate
locally and keep any regenerated secret-bearing state out of commits.

## Batch 1 Entry Criteria

Batch 1 may begin once the following are treated as the active execution scope:

1. implement the localhost OAuth session bridge on the app domain
2. validate the authoritative staging `DATABASE_URL`
3. rerun `/api/projects` and authenticated smoke against the corrected staging
   runtime

## Exit Assessment

Batch 0 is complete when:

- secret-bearing tracked InsForge linkage metadata is removed
- delivery control documents match the actual active work sequence
- the next executable batch and its blockers are explicit and evidence-backed
