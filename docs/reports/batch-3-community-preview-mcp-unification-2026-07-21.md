# Batch 3 Status Update — Community Preview MCP Unification

Date: `2026-07-21`

## Phase Objective

Complete Batch 3 agent-system unification by moving `community:preview`, the
final remaining approval-managed twin action, onto the governed MCP runtime so
direct twin-key execution and approval-triggered execution share one controlled
boundary.

## Specification Review

- Reviewed the active Batch 3 control gate in
  [current-execution-plan.md](file:///Users/user/Pictures/shothik.2/shothik-web/docs/delivery/current-execution-plan.md)
- Reviewed the direct route in
  [community-preview route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/route.ts)
- Reviewed the underlying mutation in
  [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- Confirmed the mutation already enforces the core business rules:
  - book must be owned by the twin
  - book must already be `published`
  - target forum must exist and remain open
- Confirmed the implementation must preserve:
  - internal-only MCP exposure
  - parity for `twin_key` and `user_session` principals
  - explicit confirmation-token enforcement
  - delivery-dashboard traceability

## Milestone Control

- Milestone: Batch 3 Phase 6 — governed `community:preview` execution
- Delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- Implementation owner: `TRAE/Codex pair-programming agent`
- Reviewer and approver: `Project reviewer / user`

## Implementation Plan

1. Add one internal governed MCP tool for community preview posting.
2. Add one shared helper and one internal execution route.
3. Migrate the direct route to the shared governed helper.
4. Migrate approval-triggered execution to the same governed path.
5. Add focused tests and rerun runtime regression coverage.
6. Refresh execution plan, progress log, milestone tracker, and closeout status.

## KPIs

1. `100%` of `community:preview` direct and approval-triggered flows execute
   through the governed MCP runtime.
2. `0` internal-only community-preview governance tools are exposed through
   public MCP host discovery or invocation.
3. `100%` pass rate on the focused community-preview governance test suite,
   `pnpm type-check`, and `pnpm mcp:creative-studio:test`.

## Completed Work

### 1) Added an internal governed MCP tool for community preview

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.post_community_preview`
- Tool properties:
  - route: `/api/twin/book/community-preview/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`

### 2) Added a shared governed execution helper for community preview

- Added [mcp-community-preview.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-community-preview.ts)
- New behavior:
  - invokes `shothik.twin.post_community_preview` through `ServerMCPGateway`
  - requires an explicit `confirmationToken`
  - normalizes the preview-post payload

### 3) Added an internal execution route for governed community preview

- Added [community-preview execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/execute/route.ts)
- New behavior:
  - accepts either `user_session` or `twin_key` authentication
  - validates `bookId` and `forumId`
  - resolves the active twin and calls the existing
    `twinPostCommunityPreview` mutation

### 4) Switched the direct route to the governed MCP path

- Updated [community-preview route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/route.ts)
- New behavior:
  - non-approval requests now execute through the governed MCP helper
  - approval-required requests now persist governed invocation metadata
  - route responses now include governed invocation identifiers where applicable

### 5) Switched approval-triggered community preview to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- Updated [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- New behavior:
  - when a `community:preview` approval carries governed invocation metadata,
    `approveAction` records approval without performing the side effect directly
  - after approval, the route invokes the shared governed preview helper and
    returns the resulting post and state transition

## Technical Decisions

### Why wrap the existing mutation instead of re-implementing rules

The existing `twinPostCommunityPreview` mutation already holds the authoritative
rules for ownership, publish-state validation, forum openness, book state
transition, and activity logging. The governed MCP path wraps that mutation
instead of duplicating those controls in the route layer, which reduces drift
and keeps the governed runtime aligned with the domain model.

### Security and performance notes

- The tool remains internal-only and is not exposed through public MCP host
  discovery or invocation.
- The governed helper requires confirmation tokens for the same write-risk tier
  policy boundary as the previous twin actions.
- Twin-key and user-session callers both resolve through the same internal
  execution route.

## Usage Notes

- Post a community preview through the direct route:
  - `POST /api/twin/book/community-preview`
- Internally, the direct route and approval route now converge on:
  - `POST /api/twin/book/community-preview/execute`

## Deliverables

- [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- [mcp-community-preview.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-community-preview.ts)
- [community-preview execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/execute/route.ts)
- [community-preview route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/route.ts)
- [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- [mcp-community-preview.test.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-community-preview.test.ts)
- [community-preview execute route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/execute/__tests__/route.test.ts)
- [community-preview route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/community-preview/__tests__/route.test.ts)
- [approvals route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/__tests__/route.test.ts)

## Check-Ins

1. Implementation checkpoint
   - Status: `Completed`
   - Result: direct and approval-driven `community:preview` now converge on one
     governed runtime path
2. Validation checkpoint
   - Status: `Completed`
   - Result: focused tests, type-check, and Creative Studio MCP regression all
     passed
3. Delivery checkpoint
   - Status: `Completed`
   - Result: execution plan, progress log, milestone tracker, and this phase
     report are synchronized to the validated code state

## Testing

### Focused validation

```bash
pnpm exec vitest run \
  lib/twin/mcp-community-preview.test.ts \
  lib/twin/mcp-book-publish.test.ts \
  lib/twin/mcp-book-write.test.ts \
  lib/twin/mcp-forum-post.test.ts \
  lib/twin/mcp-forum-create.test.ts \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
  app/api/twin/book/community-preview/execute/__tests__/route.test.ts \
  app/api/twin/book/community-preview/__tests__/route.test.ts \
  app/api/twin/book/publish/execute/__tests__/route.test.ts \
  app/api/twin/book/publish/__tests__/route.test.ts \
  app/api/twin/book/write/execute/__tests__/route.test.ts \
  app/api/twin/book/start/__tests__/route.test.ts \
  app/api/twin/book/upload/__tests__/route.test.ts \
  app/api/twin/book/metadata/__tests__/route.test.ts \
  app/api/twin/forum/post/execute/__tests__/route.test.ts \
  'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' \
  app/api/twin/forum/__tests__/route.test.ts \
  app/api/twin/approvals/__tests__/route.test.ts
```

Result: `46 passed`

### Type safety

```bash
pnpm type-check
```

Result: `PASS`

### End-to-end governed runtime regression

```bash
pnpm mcp:creative-studio:test
```

Result: `20 passed`

## Outcome

- KPI 1 met: `community:preview` now uses one governed execution model across
  direct twin-key execution and approval-triggered execution.
- KPI 2 met: the new community-preview tool is internal-only and remains hidden
  from public MCP host routes.
- KPI 3 met: targeted tests, type-check, and MCP runtime regression coverage all
  passed.

## Batch 3 Closeout

- All planned Batch 3 approval-managed twin actions now execute through the
  governed MCP runtime:
  - `task:*`
  - `forum:create`
  - `forum:post`
  - `book:write`
  - `book:publish`
  - `community:preview`
- Batch 3 runtime-governance backlog is closed.
- The next roadmap handoff is Batch 4: writing workflow consolidation.

## Remaining Blockers

- GitHub live tracker synchronization remains externally blocked on
  write-capable token permissions.

## Next Planned Activities

1. Publish the Batch 3 closeout state through the delivery dashboard.
2. Prepare the Batch 4 transition review for writing workflow consolidation.
3. Keep the runtime-governance evidence package available for future release
   readiness and certification work.
