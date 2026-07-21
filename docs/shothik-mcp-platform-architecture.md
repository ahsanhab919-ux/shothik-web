# Shothik MCP Platform Architecture

## Purpose

Define how Shothik adds first-class MCP connectivity and MCP app packaging
without replacing the existing InsForge-backed application backend.

This document is the first execution artifact for the unified MCP platform
enablement phase recorded in `docs/delivery/current-execution-plan.md`.

## Goals

1. let end users connect approved external MCP servers and invoke their tools
   from Shothik workflows
2. let Shothik expose selected native capabilities as MCP-compatible tools
3. package selected Shothik workflows as MCP apps for host environments such as
   ChatGPT and Claude
4. keep connector execution safe through tenant-aware auth, policy controls,
   audit logs, and usage accounting
5. preserve the current product architecture based on InsForge, Vercel, and the
   existing application API surface

## Non-goals

- replacing InsForge as the system of record
- migrating the entire backend to an MCP-only runtime
- exposing unrestricted third-party MCP connectors without policy enforcement
- shipping multiple MCP product lines before one vertical slice is proven

## Existing foundation

- core application backend:
  - InsForge for auth, Postgres-backed data, storage, and edge capabilities
  - Vercel for deployment and public web runtime
- existing tool platform:
  - internal `/api/tools/*` endpoints already represent a tool-oriented service
    layer
- existing MCP usage:
  - a basic remote MCP client exists in `lib/services/MCPClient.ts`
  - TestSprite MCP workflows are already part of local and staging operations
- existing model strategy:
  - OpenRouter is the default LLM routing layer, with Gemini, DeepSeek, and
    Kimi retained as fallbacks

## Target architecture

Shothik should implement MCP in three roles:

1. **MCP consumer**
   - connect to external MCP servers such as Higgsfield
   - discover tools, read capabilities, and invoke remote actions
2. **MCP provider**
   - expose selected Shothik-native tools and workflows as MCP-compatible tools
   - support structured invocation by external hosts and compatible clients
3. **MCP app publisher**
   - package selected workflows as interactive MCP apps
   - test them locally and against host runtimes using sunpeak

## Core system components

### 1. Connector registry

The connector registry is the control plane for all MCP integrations.

Responsibilities:

- register approved connector definitions
- store display metadata, transport type, auth mode, and risk tier
- maintain per-tenant enablement state
- track whether a connector is internal, managed, or user-supplied

Initial connector classes:

- Shothik-managed remote connector
- user-configured remote connector
- internal Shothik-native MCP connector

## 2. MCP gateway

The MCP gateway is the runtime boundary between Shothik and any MCP server.

Responsibilities:

- connector discovery and tool listing
- request normalization
- policy enforcement before tool execution
- tenant-aware auth injection
- response normalization for downstream UI and orchestration
- timeout, retry, and error classification

The MCP gateway must become the generalized replacement for the current
single-purpose `MCPClient.ts` pattern.

## 3. Policy and safety layer

Every MCP tool call must pass through a policy layer before execution.

Required controls:

- per-tenant connector allowlist
- per-connector tool allowlist or denylist
- read-only vs mutating tool classification
- rate limits and concurrency limits
- confirmation requirements for mutating operations
- audit event emission for discovery and tool execution

## 4. Secret and auth boundary

Connector secrets must not be handled ad hoc in client-side code.

Required rules:

- secrets are stored server-side only
- browser clients receive opaque connector references, not raw credentials
- OAuth and API-key auth modes must be normalized behind the gateway
- tenant ownership and revocation must be explicit
- connector auth state must be inspectable from admin tooling

## 5. Orchestration layer

The orchestration layer decides when to use:

- Shothik-native tools
- external MCP tools
- hybrid workflows that mix both

Initial orchestration direction:

- OpenRouter remains the default planner/orchestrator model layer
- tool routing uses structured plans and explicit capability metadata
- high-risk or costly tools should require policy confirmation before execution

## 6. MCP app packaging layer

sunpeak should be used for:

- MCP app packaging
- local runtime inspection
- simulation-driven UI testing
- host-runtime e2e validation
- optional live host tests and evals

sunpeak is a packaging and testing layer, not a backend replacement.

## 7. Audit and billing layer

Every connector interaction should emit structured usage events.

Minimum event fields:

- tenant id
- user id
- connector id
- tool name
- tool risk level
- duration
- status
- estimated model or connector cost when known

This layer should align with existing Shothik usage tracking and entitlement
checks.

## First vertical slice

### Name

Shothik Creative Studio

### Objective

Let a user request a creative media outcome from Shothik, have Shothik plan the
workflow, invoke a connected remote MCP service, and return a structured result
that can later be packaged as an MCP app.

### Initial stack

- planner/orchestrator: OpenRouter
- remote connector: Higgsfield MCP
- backend control plane: InsForge-backed Shothik app
- MCP app packaging and testing: sunpeak

### Scope

In scope:

- connector registration model for one managed connector
- remote tool discovery and invocation through the gateway
- policy classification for at least read vs mutating operations
- one user-facing workflow surface in the Shothik app
- one future packaging target for an MCP app UI

Out of scope:

- arbitrary user-supplied connector marketplace
- broad multi-connector orchestration
- generalized billing for all connector types
- public app-store style publishing on the first slice

## Proposed phased sequence

### Step 1: architecture definition

Deliverables:

- this architecture document
- unified delivery plan update

### Step 2: gateway contract definition

Deliverables:

- `docs/shothik-mcp-gateway-contract.md`
- `lib/mcp/gateway-contract.ts`
- gateway interface types
- connector registry model
- policy model
- audit event schema

### Step 3: first managed connector adapter

Deliverables:

- `lib/mcp/managed-connector-adapter.ts`
- `lib/mcp/gateway.ts`
- `lib/mcp/connectors/higgsfield.ts`
- Higgsfield connector definition
- auth flow contract
- tool discovery adapter
- invocation adapter

### Step 4: first Shothik workflow integration

Deliverables:

- `lib/mcp/runtime.ts`
- `lib/mcp/creative-studio.ts`
- `app/api/mcp/creative-studio/route.ts`
- `app/(primary-layout)/creative-studio/page.tsx`
- `app/(primary-layout)/creative-studio/CreativeStudioClient.tsx`
- server-side orchestration endpoint
- user-visible workflow entry point
- audit and entitlement checks

### Step 5: MCP app packaging

Deliverables:

- `docs/shothik-native-mcp-tool-mapping.md`
- `docs/shothik-sunpeak-packaging-scaffold.md`
- `docs/shothik-sunpeak-package-validation.md`
- `lib/mcp/connectors/shothik-native.ts`
- `lib/mcp/native-tools.ts`
- `lib/mcp/package-scaffold.ts`
- `lib/mcp/package-validation.ts`
- `mcp-packages/creative-studio/manifest.json`
- `mcp-packages/creative-studio/fixtures/creative-studio-smoke.json`
- `mcp-packages/creative-studio/fixtures/creative-studio-confirmed-run.json`
- `mcp-packages/creative-studio/fixtures/creative-studio-chatgpt-readiness.json`
- `mcp-packages/creative-studio/fixtures/creative-studio-claude-readiness.json`
- sunpeak packaging scaffold
- inspector fixtures
- basic e2e coverage

## Data model direction

Likely entities:

- `mcp_connectors`
- `mcp_connector_secrets`
- `mcp_connector_tools`
- `mcp_connector_policies`
- `mcp_tool_invocations`
- `mcp_app_packages`

The exact schema should be defined in the next step rather than finalized here.

## Security requirements

- no raw third-party connector secrets in client bundles
- no unrestricted mutating tool execution
- explicit tenant isolation for every connector and invocation
- revocable access for every connector credential
- auditable trail for every connector discovery and tool call
- safe default behavior when remote MCP availability is degraded

## Testing strategy

Minimum validation path:

1. unit tests for gateway normalization and policy enforcement
2. integration tests for connector discovery and invocation adapters
3. browser-level validation for the first Shothik workflow
4. sunpeak inspector-based validation for MCP app packaging
5. optional live host validation after the local packaged app is stable

## Exit criteria for the next step

The next step may begin when:

- this architecture is accepted as the current source of truth
- the unified delivery plan references this document
- the gateway contract step is chosen as the next single execution task
