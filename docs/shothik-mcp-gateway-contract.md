# Shothik MCP Gateway Contract

## Purpose

Define the Step 2 MCP gateway contract referenced by
`docs/shothik-mcp-platform-architecture.md`.

This document turns the architecture direction into an implementation contract
for the first managed-connector slice without starting connector-specific work
too early.

## Why this step exists

The current codebase has multiple MCP-specific clients:

- `lib/services/MCPClient.ts`
- `lib/mcp/EbookMCP.ts`

Those implementations are useful proof-of-concept integrations, but they are
not yet suitable as the shared runtime boundary for:

- multiple connectors
- tenant-aware policies
- server-side secret handling
- audit and usage accounting
- future MCP app packaging

This contract defines the common shapes that later adapter, schema, and route
work should follow.

## Scope

This step defines:

- connector registry records
- tool catalog records
- policy records and evaluation outcomes
- invocation request and response envelopes
- audit event structure
- runtime error taxonomy

This step does not yet implement:

- InsForge tables or migrations
- a Higgsfield adapter
- UI for connector management
- packaged MCP app assets

## Contract objectives

1. unify future MCP traffic behind one gateway contract
2. keep all connector auth and secret handling server-side
3. make policy decisions explicit before remote tool execution
4. ensure every discovery and invocation action can emit auditable events
5. keep the first slice compatible with OpenRouter-led orchestration

## Core entities

### Connector registry record

Each approved connector should have a control-plane record with the following
fields.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable internal connector id |
| `tenantId` | string | Tenant ownership boundary |
| `slug` | string | Human-readable stable key |
| `displayName` | string | UI label |
| `source` | enum | `shothik_managed`, `tenant_managed`, `shothik_native` |
| `transport` | enum | `streamable_http`, `sse`, `stdio`, `custom` |
| `authMode` | enum | `none`, `api_key`, `oauth2`, `service_token` |
| `baseUrl` | string | Connector endpoint or runtime target |
| `riskTier` | enum | `low`, `moderate`, `high`, `critical` |
| `status` | enum | `draft`, `active`, `disabled`, `revoked`, `error` |
| `capabilityStatus` | enum | `unknown`, `refreshing`, `ready`, `degraded` |
| `ownerUserId` | string nullable | Explicit user owner for tenant-managed connectors |
| `secretRef` | string nullable | Opaque reference into server-side secret storage |
| `metadata` | json | Display and vendor-specific metadata |
| `lastDiscoveredAt` | timestamp nullable | Last successful tool discovery sync |
| `createdAt` | timestamp | Audit baseline |
| `updatedAt` | timestamp | Audit baseline |

### Tool catalog record

Discovered tool metadata should be stored separately from the connector record
so Shothik can cache capability information and apply per-tool policy.

| Field | Type | Notes |
| --- | --- | --- |
| `connectorId` | string | Parent connector id |
| `name` | string | Tool name as exposed by the remote server |
| `title` | string nullable | Optional user-facing label |
| `description` | string | Tool description |
| `inputSchema` | json | Normalized parameter schema |
| `outputSchema` | json nullable | Optional normalized output schema |
| `mutationMode` | enum | `read`, `write`, `admin` |
| `riskTier` | enum | Tool-specific override of connector risk |
| `status` | enum | `enabled`, `disabled`, `hidden` |
| `metadata` | json | Raw server annotations and normalized flags |
| `discoveredAt` | timestamp | Capability freshness marker |

### Secret reference record

Secrets should not be embedded inside the connector row.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Secret record id |
| `connectorId` | string | Parent connector |
| `tenantId` | string | Tenant boundary |
| `authMode` | enum | Mirrors connector auth mode |
| `providerKey` | string | Vendor credential identifier |
| `version` | integer | Supports rotation |
| `status` | enum | `active`, `rotating`, `revoked` |
| `lastValidatedAt` | timestamp nullable | Last successful auth check |
| `expiresAt` | timestamp nullable | OAuth or temporary token expiry |

## Policy model

### Policy layers

Every invocation should pass through all policy layers in this order:

1. tenant connector enablement
2. connector status validation
3. tool status validation
4. mutation and risk policy
5. entitlement and quota checks
6. confirmation requirement evaluation
7. execution budget checks such as timeout or concurrency

### Policy record

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Stable policy id |
| `tenantId` | string | Tenant scope |
| `connectorId` | string | Connector scope |
| `toolName` | string nullable | Null means connector-wide |
| `effect` | enum | `allow`, `deny`, `confirm`, `meter` |
| `mutationMode` | enum nullable | Optional match on `read`, `write`, `admin` |
| `maxCallsPerMinute` | integer nullable | Rate limit |
| `maxConcurrentCalls` | integer nullable | Concurrency limit |
| `requiresConfirmedUserAction` | boolean | Extra confirmation for risky actions |
| `allowedRoles` | string[] | Tenant roles permitted to invoke |
| `metadata` | json | Extensible condition block |

### Policy decision

The gateway must normalize evaluation into a deterministic decision object.

| Field | Type | Notes |
| --- | --- | --- |
| `decision` | enum | `allow`, `deny`, `confirm_required` |
| `reasonCode` | enum | Stable machine-readable code |
| `matchedPolicyIds` | string[] | Traceability |
| `effectiveRiskTier` | enum | Final risk classification |
| `quotaSnapshot` | json nullable | Optional entitlement view |

### Minimum reason codes

- `connector_disabled`
- `connector_revoked`
- `tool_disabled`
- `tool_not_allowlisted`
- `role_not_allowed`
- `confirmation_required`
- `quota_exceeded`
- `rate_limited`
- `concurrency_limited`
- `secret_unavailable`

## Invocation contract

### Request envelope

Every gateway tool execution should use a normalized request envelope.

```ts
interface MCPGatewayInvokeRequest {
  tenantId: string;
  userId: string | null;
  connectorId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  idempotencyKey?: string;
  traceId?: string;
  origin:
    | 'server_action'
    | 'api_route'
    | 'workflow_orchestrator'
    | 'mcp_host';
  dryRun?: boolean;
  confirmationToken?: string;
  timeoutMs?: number;
}
```

### Response envelope

```ts
interface MCPGatewayInvokeResult {
  invocationId: string;
  connectorId: string;
  toolName: string;
  status: 'success' | 'blocked' | 'failed';
  output: unknown;
  outputText?: string;
  policyDecision: MCPPolicyDecision;
  metrics: {
    durationMs: number;
    retries: number;
    estimatedCostUsd?: number;
  };
  error?: MCPGatewayError;
}
```

### Discovery contract

```ts
interface MCPGatewayDiscoveryRequest {
  tenantId: string;
  connectorId: string;
  forceRefresh?: boolean;
  traceId?: string;
}
```

```ts
interface MCPGatewayDiscoveryResult {
  connectorId: string;
  discoveredAt: string;
  status: 'success' | 'degraded' | 'failed';
  tools: MCPToolDescriptor[];
  error?: MCPGatewayError;
}
```

## Audit event schema

Every discovery and invocation path must emit a structured event whether the
request succeeds, is blocked by policy, or fails at runtime.

### Required event families

- `mcp.connector.discovery.started`
- `mcp.connector.discovery.completed`
- `mcp.connector.discovery.failed`
- `mcp.tool.invocation.started`
- `mcp.tool.invocation.blocked`
- `mcp.tool.invocation.completed`
- `mcp.tool.invocation.failed`
- `mcp.connector.secret.validation.failed`

### Event payload

| Field | Type | Notes |
| --- | --- | --- |
| `eventId` | string | Stable event id |
| `eventType` | string | Event family |
| `timestamp` | timestamp | Emission time |
| `traceId` | string nullable | Cross-system correlation |
| `tenantId` | string | Tenant boundary |
| `userId` | string nullable | User actor when present |
| `connectorId` | string | Connector reference |
| `toolName` | string nullable | Tool reference |
| `origin` | string | Request source |
| `status` | enum | `started`, `success`, `blocked`, `failed` |
| `riskTier` | enum nullable | Effective risk |
| `durationMs` | integer nullable | Runtime duration |
| `policyReasonCode` | string nullable | For blocked or conditioned runs |
| `estimatedCostUsd` | number nullable | If known |
| `requestBytes` | integer nullable | Optional telemetry |
| `responseBytes` | integer nullable | Optional telemetry |
| `metadata` | json | Sanitized, non-secret details |

### Audit rules

- events must never include raw connector secrets
- high-risk tool arguments should be redacted or hashed before persistence
- failed auth should record the failure class, not the credential value
- blocked invocations should still emit auditable events

## Error taxonomy

All adapters should map transport and vendor errors into a stable gateway error
shape.

| Code | Meaning |
| --- | --- |
| `connector_not_found` | Unknown or inaccessible connector id |
| `connector_unavailable` | Transport unavailable or health degraded |
| `connector_auth_failed` | Secret missing, expired, or rejected |
| `tool_not_found` | Requested tool missing from connector |
| `policy_denied` | Request rejected by policy |
| `confirmation_required` | Mutating action needs explicit confirmation |
| `rate_limited` | Per-policy or per-connector rate limit triggered |
| `timeout` | Connector invocation exceeded budget |
| `upstream_invalid_response` | Connector returned malformed data |
| `upstream_execution_failed` | Connector executed but returned an error |

## Gateway interface direction

The code contract should expose a small server-side interface that later
adapters implement.

```ts
interface MCPGateway {
  discoverTools(
    request: MCPGatewayDiscoveryRequest,
  ): Promise<MCPGatewayDiscoveryResult>;

  invokeTool(
    request: MCPGatewayInvokeRequest,
  ): Promise<MCPGatewayInvokeResult>;
}
```

The gateway may depend on internal collaborators such as:

- connector registry repository
- secret resolver
- policy evaluator
- usage and entitlement service
- transport adapter registry
- audit event writer

Those collaborators should remain internal wiring details rather than part of
the public invocation contract.

## Implementation boundaries for the next code step

The next implementation step should introduce:

1. shared TypeScript types for the contract
2. one server-side gateway scaffold
3. one adapter interface for managed remote connectors
4. one policy evaluator stub with deterministic reason codes

The next step should not yet introduce:

- arbitrary user-supplied marketplace connectors
- host-side MCP app packaging logic
- full billing settlement for connector costs

## Relationship to the first vertical slice

For Shothik Creative Studio, this contract means:

- Higgsfield is represented as one managed connector record
- capability discovery caches available creative tools
- high-risk media generation actions can require explicit confirmation
- OpenRouter plans which connector tool to call, but the gateway executes and
  audits the call
- sunpeak packaging can later target the same normalized invocation layer

## Exit criteria for this step

This gateway contract step is complete when:

1. this document is versioned in repo
2. the type scaffold aligns with this contract
3. the unified execution plan points to the managed-connector adapter as the
   next step
