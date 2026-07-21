# Batch 3 Status Update — Forum Create MCP Unification

Date: `2026-07-21`

## Phase Objective

Continue the Batch 3 agent-system unification plan by moving `forum:create`,
the next smallest approval-managed twin action, onto the governed MCP runtime so
direct twin-key execution and approval-triggered execution share one controlled
boundary.

## Milestone Control

- Milestone: Batch 3 Phase 2 — governed `forum:create` execution
- Delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- Implementation owner: `TRAE/Codex pair-programming agent`
- Reviewer and approver: `Project reviewer / user`

## KPIs

1. `100%` of `forum:create` direct and approval-triggered flows execute through
   the governed MCP runtime.
2. `0` internal-only forum-governance tools are exposed through public MCP host
   discovery or invocation.
3. `100%` pass rate on the focused forum-governance test suite,
   `pnpm type-check`, and `pnpm mcp:creative-studio:test`.

## Completed Work

### 1) Added an internal governed MCP tool for forum creation

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.create_forum`
- Tool properties:
  - route: `/api/twin/forum/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`

### 2) Propagated twin-key auth through native loopback invocation

- Updated [shothik-native-adapter.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/shothik-native-adapter.ts)
- New behavior:
  - forwards authenticated session cookies as before
  - now also forwards `Bearer shothik_agent_*` authorization headers when the
    current request was authenticated by a twin key

This preserves runtime parity for governed twin actions that originate from
agent-key routes instead of browser sessions.

### 3) Added a shared governed execution helper for forum creation

- Added [mcp-forum-create.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-create.ts)
- New behavior:
  - invokes `shothik.twin.create_forum` through `ServerMCPGateway`
  - requires an explicit `confirmationToken`
  - normalizes the resulting `forumId` + `status` payload

### 4) Added an internal execution route for governed forum creation

- Added [forum/execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/execute/route.ts)
- New behavior:
  - accepts either `user_session` or `twin_key` authentication
  - validates `title`, `participantType`, and `votingMode`
  - resolves the active twin and performs the underlying `twinCreateForum`
    mutation

### 5) Switched direct twin forum creation to the governed MCP path

- Updated [forum route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/route.ts)
- New behavior:
  - non-approval `forum:create` requests now execute through the governed MCP
    helper instead of calling the mutation directly
  - approval-required requests now persist explicit governed invocation metadata
    in the approval payload
  - approval payload now preserves forum metadata required for a later governed
    execution pass

### 6) Switched approval-triggered forum creation to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- Updated [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- New behavior:
  - when a `forum:create` approval carries governed invocation metadata,
    `approveAction` records approval without performing the side effect directly
  - after approval, the route now invokes the shared governed forum-create
    helper and returns forum creation status

## Deliverables

- [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- [shothik-native-adapter.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/shothik-native-adapter.ts)
- [mcp-forum-create.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-create.ts)
- [forum/execute route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/execute/route.ts)
- [forum route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/route.ts)
- [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- [convex/twin.ts](file:///Users/user/Pictures/shothik.2/shothik-web/convex/twin.ts)
- [mcp-forum-create.test.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-forum-create.test.ts)
- [forum route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/forum/__tests__/route.test.ts)
- [approvals route test](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/__tests__/route.test.ts)

## Check-Ins

1. Implementation checkpoint
   - Status: `Completed`
   - Result: direct and approval-driven `forum:create` flows now converge on one
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
  lib/twin/mcp-forum-create.test.ts \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
  app/api/twin/forum/__tests__/route.test.ts \
  app/api/twin/approvals/__tests__/route.test.ts
```

Result: `10 passed`

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

- KPI 1 met: `forum:create` now uses one governed execution model across
  twin-key direct execution and approval-triggered execution.
- KPI 2 met: the new forum-create tool is internal-only and remains hidden from
  public MCP host routes.
- KPI 3 met: targeted tests, type-check, and MCP regression coverage all passed.

## Remaining Blockers

- Remaining Batch 3 actions still on bespoke execution paths:
  - `forum:post`
  - `book:write`
  - `book:publish`
  - `community:preview`
- GitHub live tracker synchronization remains externally blocked on
  write-capable token permissions.

## Next Planned Activities

1. Apply the same governed execution pattern to `forum:post`.
2. Continue sequentially through `book:write`, `book:publish`, and
   `community:preview`.
3. Keep the delivery dashboard synchronized after each Batch 3 slice so the
   batch handoff to Batch 4 remains evidence-backed.
