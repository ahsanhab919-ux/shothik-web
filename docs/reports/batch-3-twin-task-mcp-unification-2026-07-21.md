# Batch 3 Status Update — Twin Task MCP Unification

Date: `2026-07-21`

## Phase Objective

Continue the Batch 3 agent-system unification plan by moving the highest-volume
`twin` execution path (`task:*`) onto the governed MCP runtime so approval,
execution, and audit share the same execution boundary.

## Completed Work

### 1) Added an internal governed MCP tool for twin task execution

- Updated [native-tools.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/native-tools.ts)
- Added native MCP tool:
  - `shothik.twin.execute_task`
- Tool properties:
  - route: `/api/twin/tasks/execute`
  - mutation mode: `write`
  - risk tier: `high`
  - host exposure: `internal`

### 2) Prevented unsafe public host exposure

- Public MCP host discovery and invocation continue to expose only public native
  tools.
- Internal-only tools are now filtered out of:
  - [GET /api/mcp/tools](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tools/route.ts)
  - [POST /api/mcp/tool](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tool/route.ts)

This preserves least privilege and avoids exposing a tool whose underlying route
still depends on the twin session model.

### 3) Introduced a shared governed execution helper for twin tasks

- Added [mcp-task-execution.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/twin/mcp-task-execution.ts)
- New behavior:
  - routes twin task execution through `ServerMCPGateway`
  - uses the native connector for the tenant
  - requires an explicit `confirmationToken`
  - normalizes the task execution payload returned by the underlying execution
    route

### 4) Switched direct task execution to the governed MCP path

- Updated [tasks route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/tasks/route.ts)
- New behavior:
  - when a task does not require prior approval, execution now goes through the
    governed MCP helper instead of directly calling the voice-generation path
  - response still returns task result + voice-gate metadata
  - pending approvals now record governed invocation metadata in the payload:
    - tool name
    - confirmation requirement

### 5) Switched approval-triggered task execution to the governed MCP path

- Updated [approvals route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/twin/approvals/route.ts)
- New behavior:
  - after approval, `task:*` execution now uses the same governed MCP helper
  - approval-triggered execution returns the same voice-gate outcome fields as
    before
  - direct ad hoc LLM execution from the approval route was removed for
    `task:*`

## Testing

### Type safety

```bash
pnpm type-check
```

Result: `PASS`

### Focused validation

```bash
pnpm exec vitest run \
  lib/twin/mcp-task-execution.test.ts \
  lib/__tests__/native-tools.test.ts \
  app/api/mcp/tools/route.test.ts \
  app/api/mcp/tool/route.test.ts
```

Result: `15 passed`

### MCP regression coverage

```bash
pnpm exec vitest run lib/__tests__/mcp-gateway.test.ts
pnpm mcp:creative-studio:test
```

Result:

- `mcp-gateway.test.ts` — `3 passed`
- `mcp:creative-studio:test` — `20 passed`

## Outcomes

- `twin` task execution now has runtime parity across:
  - direct execution path
  - approval-triggered execution path
- execution for `task:*` now shares:
  - gateway policy enforcement
  - gateway audit generation
  - governed connector/tool identity
- public MCP host routes remain least-privilege and do not expose this internal
  execution surface

## Encountered Blockers

### No blocking defects

- No blocker prevents continuing Batch 3.

### Remaining non-blocking gap

- Other approval actions still use bespoke execution paths and are not yet
  routed through governed MCP invocations:
  - `forum:create`
  - `forum:post`
  - `book:write`
  - `book:publish`
  - `community:preview`

## Next Planned Activities

1. Extend the same governed invocation pattern to remaining approval-managed
   domain actions, starting with the smallest side-effectful path.
2. Standardize approval payloads around explicit governed tool metadata so
   approvals can be audited and replayed uniformly.
3. Evaluate whether the internal-only twin execution tool should later move from
   HTTP loopback to a direct-call internal execution surface once the broader
   Batch 3 unification is complete.

