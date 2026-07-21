# Batch 3 Status Update — Forum Post MCP Unification

Date: `2026-07-21`

## Phase Objective

Continue the Batch 3 agent-system unification plan by moving `forum:post`, the
next remaining forum-side approval-managed twin action, onto the governed MCP
runtime so direct twin-key execution and approval-triggered execution share one
controlled boundary.

## Milestone Control

- Milestone: Batch 3 Phase 3 — governed `forum:post` execution
- Delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- Implementation owner: `TRAE/Codex pair-programming agent`
- Reviewer and approver: `Project reviewer / user`

## KPIs

1. `100%` of `forum:post` direct and approval-triggered flows execute through
   the governed MCP runtime.
2. `0` internal-only forum-post governance tools are exposed through public MCP
   host discovery or invocation.
3. `100%` pass rate on the focused forum-post governance test suite,
   `pnpm type-check`, and `pnpm mcp:creative-studio:test`.

## Completed Work

### 1) Added an internal governed MCP tool for forum posting

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.create_forum_post`
- Tool properties:
  - route: `/api/twin/forum/post/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`

### 2) Added a shared governed execution helper for forum posts

- Added [mcp-forum-post.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-post.ts)
- New behavior:
  - invokes `shothik.twin.create_forum_post` through `ServerMCPGateway`
  - requires an explicit `confirmationToken`
  - normalizes the resulting `postId`, `forumId`, and `status` payload

### 3) Added an internal execution route for governed forum posting

- Added [forum post execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/post/execute/route.ts)
- New behavior:
  - accepts either `user_session` or `twin_key` authentication
  - validates `forumId` and `content`
  - resolves the active twin and performs the underlying `twinCreateForumPost`
    mutation

### 4) Switched direct twin forum posting to the governed MCP path

- Updated [forum post route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/[forumId]/post/route.ts)
- New behavior:
  - non-approval `forum:post` requests now execute through the governed MCP
    helper instead of calling the mutation directly
  - approval-required requests now persist explicit governed invocation metadata
    in the approval payload

### 5) Switched approval-triggered forum posting to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- Updated [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- New behavior:
  - when a `forum:post` approval carries governed invocation metadata,
    `approveAction` records approval without performing the side effect directly
  - after approval, the route now invokes the shared governed forum-post helper
    and returns forum-post creation status

## Deliverables

- [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- [mcp-forum-post.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-post.ts)
- [forum post execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/post/execute/route.ts)
- [forum post route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/[forumId]/post/route.ts)
- [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- [mcp-forum-post.test.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-post.test.ts)
- [forum post execute route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/post/execute/__tests__/route.test.ts)
- [forum post route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/[forumId]/post/__tests__/route.test.ts)
- [approvals route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/__tests__/route.test.ts)

## Check-Ins

1. Implementation checkpoint
   - Status: `Completed`
   - Result: direct and approval-driven `forum:post` flows now converge on one
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
  lib/twin/mcp-forum-post.test.ts \
  lib/twin/mcp-forum-create.test.ts \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
  app/api/twin/forum/post/execute/__tests__/route.test.ts \
  'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' \
  app/api/twin/forum/__tests__/route.test.ts \
  app/api/twin/approvals/__tests__/route.test.ts
```

Result: `18 passed`

### Type safety

```bash
pnpm type-check
```

Result: `PASS`

### MCP regression coverage

```bash
pnpm mcp:creative-studio:test
```

Result: `20 passed`

## Outcome

- KPI 1 met: `forum:post` now uses one governed execution model across twin-key
  direct execution and approval-triggered execution.
- KPI 2 met: the new forum-post tool is internal-only and remains hidden from
  public MCP host routes.
- KPI 3 met: targeted tests, type-check, and MCP regression coverage all
  passed.

## Remaining Blockers

- Remaining Batch 3 actions still on bespoke execution paths:
  - `book:write`
  - `book:publish`
  - `community:preview`
- GitHub live tracker synchronization remains externally blocked on
  write-capable token permissions.

## Next Planned Activities

1. Apply the same governed execution pattern to `book:write`.
2. Continue sequentially through `book:publish` and `community:preview`.
3. Keep the delivery dashboard synchronized after each Batch 3 slice so the
   batch handoff to Batch 4 remains evidence-backed.
