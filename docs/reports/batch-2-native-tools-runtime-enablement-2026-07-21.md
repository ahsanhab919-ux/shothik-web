# Batch 2 — Native Tools Runtime Enablement

Date: `2026-07-21`

## Milestone Objective

Enable Shothik native tools to operate as an MCP host runtime surface with:

- Authenticated discovery (`GET /api/mcp/tools`)
- Authenticated invocation (`POST /api/mcp/tool`)
- Gateway-enforced policy + audit (via `ServerMCPGateway`)
- Adapter-backed execution for the `shothik-native:<tenantId>` connector

## What Shipped

### 1) Native connector made adapter-resolvable

- Added a stable adapter key for the native connector:
  - [shothik-native.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/connectors/shothik-native.ts)
    - `SHOTHIK_NATIVE_ADAPTER_KEY = "shothik_native_http"`
    - connector metadata now includes `adapterKey`
    - connector metadata optionally includes `appOrigin` (from `NEXT_PUBLIC_APP_URL`) for loopback execution

### 2) Native connector adapter (execution path)

- Added `ShothikNativeConnectorAdapter`:
  - [shothik-native-adapter.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/shothik-native-adapter.ts)
  - Responsibilities:
    - `discoverTools()` returns `listShothikNativeMcpTools(tenantId)`
    - `invokeTool()` maps tool → `metadata.routePath` and executes the underlying route via HTTP loopback with forwarded cookies (best-effort)
    - errors normalized to `ManagedConnectorAdapterError` for consistent gateway mapping

### 3) Runtime wiring (gateway now supports both remote + native)

- Updated the runtime gateway wiring so one gateway can resolve:
  - Higgsfield remote connector (when configured)
  - Shothik native connector (always available for each tenant)
- Changes in:
  - [runtime.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/runtime.ts)

### 4) Provider-side MCP endpoints

- Tool discovery:
  - [GET /api/mcp/tools](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tools/route.ts)
  - Returns the native tool catalog in MCP server-compatible format:
    - `[{ name, title, description, parameters, outputSchema }]`
  - Enforces authentication via `getAuthenticatedUser()`

- Tool invocation:
  - [POST /api/mcp/tool](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tool/route.ts)
  - Accepts:
    - `name`
    - `parameters`
    - `traceId`, `dryRun`, `timeoutMs`, `confirmationToken` (optional)
  - Enforces authentication and restricts invocation to allowlisted native tools only.
  - Runs the invocation through `ServerMCPGateway` so policy and audit are always applied.

## Testing (Mandatory)

### TypeScript

```bash
pnpm type-check
```

Result: `PASS`

### Unit tests (new endpoints)

```bash
pnpm exec vitest run \
  app/api/mcp/tools/route.test.ts \
  app/api/mcp/tool/route.test.ts
```

Result: `7 passed`

### MCP regression suites

```bash
pnpm mcp:package:validate
pnpm mcp:creative-studio:test
```

Result:

- `mcp:package:validate` — `20 passed`
- `mcp:creative-studio:test` — `20 passed`

## Success Criteria Status

- Native tools are discoverable via MCP endpoint: `PASS`
- Native tools are invokable via MCP endpoint with gateway policy/audit: `PASS`
- No regressions in existing MCP package/runtime suites: `PASS`

## Identified Blockers / Follow-ups

- Native tool execution currently uses HTTP loopback to existing `/api/tools/*` routes.
  - This is functional and policy-governed but not optimal for latency.
  - Follow-up (later batch): refactor hot-path native tools into direct-call server functions to avoid loopback and to enable richer usage attribution without relying on HTTP request heuristics.

