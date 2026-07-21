# Batch 3 Status Update — Book Write MCP Unification

Date: `2026-07-21`

## Phase Objective

Continue the Batch 3 agent-system unification plan by moving `book:write`, the
next remaining approval-managed twin action, onto the governed MCP runtime so
direct twin-key execution and approval-triggered execution share one controlled
boundary across the three current book-write operations:

1. `start`
2. `upload`
3. `metadata`

## Specification Review

- Reviewed the active Batch 3 control gate in
  [current-execution-plan.md](file:///Users/user/Pictures/shothik.2/shothik-web/docs/delivery/current-execution-plan.md)
- Reviewed the existing direct routes:
  - [book/start route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/start/route.ts)
  - [book/upload route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/upload/route.ts)
  - [book/metadata route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/metadata/route.ts)
- Reviewed the existing approval resolver in
  [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- Confirmed the implementation must preserve:
  - internal-only MCP exposure
  - parity for `twin_key` and `user_session` principals
  - explicit confirmation-token enforcement
  - auditability and delivery-dashboard traceability

## Milestone Control

- Milestone: Batch 3 Phase 4 — governed `book:write` execution
- Delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- Implementation owner: `TRAE/Codex pair-programming agent`
- Reviewer and approver: `Project reviewer / user`

## Implementation Plan

1. Add one internal governed MCP tool for the shared `book:write` lane.
2. Add one shared helper and one internal execution route with an explicit
   operation mode: `start`, `upload`, or `metadata`.
3. Migrate the three direct routes to the shared helper.
4. Migrate approval-triggered execution to the same governed path.
5. Add focused tests and rerun runtime regression coverage.
6. Refresh execution plan, progress log, milestone tracker, and phase report.

## KPIs

1. `100%` of `book:write` direct and approval-triggered flows execute through
   the governed MCP runtime across `start`, `upload`, and `metadata`.
2. `0` internal-only book-write governance tools are exposed through public MCP
   host discovery or invocation.
3. `100%` pass rate on the focused book-write governance test suite,
   `pnpm type-check`, and `pnpm mcp:creative-studio:test`.

## Completed Work

### 1) Added an internal governed MCP tool for the full book-write lane

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.execute_book_write`
- Tool properties:
  - route: `/api/twin/book/write/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`
  - operation modes: `start`, `upload`, `metadata`

### 2) Added a shared governed execution helper for book write

- Added [mcp-book-write.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-write.ts)
- New behavior:
  - invokes `shothik.twin.execute_book_write` through `ServerMCPGateway`
  - requires an explicit `confirmationToken`
  - normalizes a shared response shape across the three book-write operations

### 3) Added an internal execution route for governed book write

- Added [book write execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/write/execute/route.ts)
- New behavior:
  - accepts either `user_session` or `twin_key` authentication
  - validates the requested operation mode
  - resolves the active twin and performs the corresponding draft mutation path
  - returns a normalized status payload

### 4) Switched direct book routes to the governed MCP path

- Updated [book/start route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/start/route.ts)
- Updated [book/upload route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/upload/route.ts)
- Updated [book/metadata route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/metadata/route.ts)
- New behavior:
  - non-approval requests now execute through the governed MCP helper
  - approval-required requests now persist governed invocation metadata
  - route responses now include governed invocation identifiers where applicable

### 5) Switched approval-triggered book write to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- Updated [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- New behavior:
  - when a `book:write` approval carries governed invocation metadata,
    `approveAction` records approval without performing the side effect directly
  - after approval, the route invokes the shared governed book-write helper and
    returns the resulting operation status

## Technical Decisions

### Why one tool instead of three

`book:write` already exists as one approval action spanning three route-level
operations. Implementing one governed tool with an explicit `operation` field:

- preserves the current approval model
- avoids fragmenting policy behavior across multiple tool names
- makes the next Batch 3 slices easier to compare and audit

### Security and performance notes

- The tool remains internal-only and is not exposed through public MCP host
  discovery or invocation.
- The governed helper requires confirmation tokens for the same write-risk tier
  policy boundary as the previous twin actions.
- Twin-key and user-session callers both resolve through the same internal
  execution route, preserving runtime parity.

## Usage Notes

- Start a book draft through the direct route:
  - `POST /api/twin/book/start`
- Upload draft content through the direct route:
  - `POST /api/twin/book/upload`
- Submit metadata for master review through the direct route:
  - `POST /api/twin/book/metadata`
- Internally, all three flows now converge on:
  - `POST /api/twin/book/write/execute`

## Deliverables

- [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- [mcp-book-write.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-write.ts)
- [book write execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/write/execute/route.ts)
- [book/start route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/start/route.ts)
- [book/upload route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/upload/route.ts)
- [book/metadata route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/metadata/route.ts)
- [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- [mcp-book-write.test.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-book-write.test.ts)
- [book write execute route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/write/execute/__tests__/route.test.ts)
- [book/start route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/start/__tests__/route.test.ts)
- [book/upload route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/upload/__tests__/route.test.ts)
- [book/metadata route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/book/metadata/__tests__/route.test.ts)

## Check-Ins

1. Implementation checkpoint
   - Status: `Completed`
   - Result: `start`, `upload`, and `metadata` now converge on one governed
     runtime path
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
  lib/twin/mcp-book-write.test.ts \
  lib/twin/mcp-forum-post.test.ts \
  lib/twin/mcp-forum-create.test.ts \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
  app/api/twin/book/write/execute/__tests__/route.test.ts \
  app/api/twin/book/start/__tests__/route.test.ts \
  app/api/twin/book/upload/__tests__/route.test.ts \
  app/api/twin/book/metadata/__tests__/route.test.ts \
  app/api/twin/forum/post/execute/__tests__/route.test.ts \
  'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' \
  app/api/twin/forum/__tests__/route.test.ts \
  app/api/twin/approvals/__tests__/route.test.ts
```

Result: `30 passed`

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

- KPI 1 met: `book:write` now uses one governed execution model across direct
  twin-key execution and approval-triggered execution.
- KPI 2 met: the new book-write tool is internal-only and remains hidden from
  public MCP host routes.
- KPI 3 met: targeted tests, type-check, and MCP runtime regression coverage all
  passed.

## Unresolved Edge Cases

- Approval payloads now carry full upload content for governed parity. This is
  correct for the current flow but should be revisited if payload-size limits or
  approval-storage constraints become a concern.
- `book:publish` and `community:preview` remain on bespoke execution paths until
  the next Batch 3 slices are completed.

## Next Planned Activities

1. Apply the same governed execution pattern to `book:publish`.
2. Continue sequentially to `community:preview`.
3. Keep the delivery dashboard synchronized after each Batch 3 slice so the
   batch handoff to Batch 4 remains evidence-backed.
