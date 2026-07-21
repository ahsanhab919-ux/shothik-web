# Batch 3 Status Update — Book Publish MCP Unification

Date: `2026-07-21`

## Phase Objective

Continue the Batch 3 agent-system unification plan by moving `book:publish`,
the next remaining approval-managed twin action, onto the governed MCP runtime
so direct twin-key execution and approval-triggered execution share one
controlled boundary.

## Specification Review

- Reviewed the active Batch 3 control gate in
  [current-execution-plan.md](file:///Users/user/Pictures/shothik.2/shothik-web/docs/delivery/current-execution-plan.md)
- Reviewed the existing approval resolver branch in
  [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- Reviewed the current permissions contract in
  [twin-permissions.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin-permissions.ts)
- Confirmed an implementation gap:
  - `book:publish` existed in permissions and approval handling
  - no live direct route existed yet under `app/api/twin/book`
- Confirmed the implementation must preserve:
  - internal-only MCP exposure
  - parity for `twin_key` and `user_session` principals
  - explicit confirmation-token enforcement
  - delivery-dashboard traceability

## Milestone Control

- Milestone: Batch 3 Phase 5 — governed `book:publish` execution
- Delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- Implementation owner: `TRAE/Codex pair-programming agent`
- Reviewer and approver: `Project reviewer / user`

## Implementation Plan

1. Add one internal governed MCP tool for the publish lane.
2. Add one shared helper and one internal execution route.
3. Introduce the missing direct publish route.
4. Migrate approval-triggered execution to the same governed path.
5. Add focused tests and rerun runtime regression coverage.
6. Refresh execution plan, progress log, milestone tracker, and phase report.

## KPIs

1. `100%` of `book:publish` direct and approval-triggered flows execute through
   the governed MCP runtime.
2. `0` internal-only book-publish governance tools are exposed through public
   MCP host discovery or invocation.
3. `100%` pass rate on the focused book-publish governance test suite,
   `pnpm type-check`, and `pnpm mcp:creative-studio:test`.

## Completed Work

### 1) Added an internal governed MCP tool for book publishing

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.publish_book`
- Tool properties:
  - route: `/api/twin/book/publish/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`

### 2) Added a shared governed execution helper for book publishing

- Added [mcp-book-publish.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-publish.ts)
- New behavior:
  - invokes `shothik.twin.publish_book` through `ServerMCPGateway`
  - requires an explicit `confirmationToken`
  - normalizes the publish transition payload

### 3) Added an internal execution route for governed book publish

- Added [book publish execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/execute/route.ts)
- New behavior:
  - accepts either `user_session` or `twin_key` authentication
  - validates `bookId`
  - resolves the active twin and performs the `approved -> published`
    transition through `twinAdvanceBookContentState`

### 4) Added the missing direct publish route

- Added [book publish route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/route.ts)
- New behavior:
  - gives the `book:publish` permission a live direct route under
    `app/api/twin/book`
  - non-approval requests now execute through the governed MCP helper
  - approval-required requests now persist governed invocation metadata

### 5) Switched approval-triggered book publish to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- Updated [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- New behavior:
  - when a `book:publish` approval carries governed invocation metadata,
    `approveAction` records approval without performing the side effect directly
  - after approval, the route invokes the shared governed publish helper and
    returns the resulting state transition

## Technical Decisions

### Why add a direct route in this slice

The roadmap and permissions model already treat `book:publish` as a distinct
twin action. Because the approval resolver already supported it, leaving the
direct route absent would keep the slice partially implemented and make runtime
parity impossible. This phase closes that gap by adding the missing direct API
surface and immediately governing it.

### Security and performance notes

- The tool remains internal-only and is not exposed through public MCP host
  discovery or invocation.
- The governed helper requires confirmation tokens for the same write-risk tier
  policy boundary as the previous twin actions.
- Twin-key and user-session callers both resolve through the same internal
  execution route.

## Usage Notes

- Publish an approved book through the direct route:
  - `POST /api/twin/book/publish`
- Internally, the direct route and approval route now converge on:
  - `POST /api/twin/book/publish/execute`

## Deliverables

- [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- [mcp-book-publish.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-publish.ts)
- [book publish execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/execute/route.ts)
- [book publish route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/route.ts)
- [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- [mcp-book-publish.test.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-publish.test.ts)
- [book publish execute route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/execute/__tests__/route.test.ts)
- [book publish route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/publish/__tests__/route.test.ts)
- [approvals route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/__tests__/route.test.ts)

## Check-Ins

1. Implementation checkpoint
   - Status: `Completed`
   - Result: the missing direct publish route and approval branch now converge on
     one governed runtime path
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
  lib/twin/mcp-book-publish.test.ts \
  lib/twin/mcp-book-write.test.ts \
  lib/twin/mcp-forum-post.test.ts \
  lib/twin/mcp-forum-create.test.ts \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
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

Result: `38 passed`

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

- KPI 1 met: `book:publish` now uses one governed execution model across direct
  twin-key execution and approval-triggered execution.
- KPI 2 met: the new book-publish tool is internal-only and remains hidden from
  public MCP host routes.
- KPI 3 met: targeted tests, type-check, and MCP runtime regression coverage all
  passed.

## Unresolved Edge Cases

- The direct route is newly introduced in this slice, so any UI or workflow
  consumers not yet calling it remain a follow-up integration concern rather
  than a runtime-governance blocker.
- `community:preview` remains on a bespoke execution path until the next Batch 3
  slice is completed.

## Next Planned Activities

1. Apply the same governed execution pattern to `community:preview`.
2. Refresh the delivery dashboard after the final Batch 3 slice closes.
3. Prepare the Batch 3 handoff package for the Batch 4 transition gate.
