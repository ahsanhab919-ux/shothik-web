# Batch 3 Compliance Report — Agent-System Unification

Date: `2026-07-21`

## Scope

Batch 3 covers the unification boundary between:

- MCP-native tool discovery/execution
- Agent-origin execution
- Authentication and authorization boundaries
- Auditability and runtime governance

This report records:

- pre-implementation standards verification
- in-process quality and compliance audits
- corrective actions implemented
- post-completion validation evidence

## Applicable Standards And Compliance Baselines

### Primary technical security baselines

- **OWASP ASVS 5.0.0** baseline alignment for web/API systems handling authenticated and governed actions:
  - V4 API and Web Service
  - V6 Authentication
  - V7 Session Management
  - V8 Authorization
  - V10 OAuth and OIDC
  - V13 Configuration
  - V14 Data Protection
  - V15 Secure Coding and Architecture
  - V16 Security Logging and Error Handling
- **MCP security best-practice baseline**:
  - authenticate every inbound MCP request
  - deny by default on unsupported/unknown tool requests
  - prevent execution-path drift between discovery and invocation
  - maintain attributable audit trails for tool discovery and invocation
  - enforce policy at the gateway, not in ad hoc route-specific execution logic
- **Least-privilege and privacy-by-design principles**:
  - use the minimum viable identity context for tool execution
  - avoid exposing unnecessary execution surfaces
  - keep identity attribution bounded to authenticated user/twin principals

### External reference check

The standards review used current external benchmark material for:

- MCP security guidance around verification of inbound requests, least privilege,
  token-bound trust, and auditable tool execution
- OWASP ASVS 5.0.0 as the current application/API verification baseline for 2025+

References consulted:

- [OWASP ASVS overview](https://owasp.org/www-project-developer-guide/release/verification/guides/asvs/)
- [OWASP ASVS 5.0.0 summary](https://quality.arc42.org/standards/owasp-asvs)
- [MCP security controls 2025 update](https://github.com/thanhmiyata/mcp-for-beginners/blob/main/02-Security/mcp-security-controls-2025.md)
- [MCP server security best practices](https://truefoundry.com/blog/mcp-server-security-best-practices)

## Pre-Implementation Standards Verification

### Workplan review findings

Before implementation, the current Batch 3 path was checked against the above
controls. The following mandatory gaps were found:

1. **Discovery/execution path drift**
   - `GET /api/mcp/tools` returned a static native catalog directly instead of
     using the governed runtime discovery path.
   - Compliance risk:
     - runtime parity failure
     - incomplete audit trace
     - discovery could diverge from actual executable tool state

2. **Split authentication model for agent-origin operations**
   - MCP host routes supported signed-in users but not the twin-key agent
     identity model already used elsewhere in the repo.
   - Compliance risk:
     - inconsistent principal handling
     - pressure to bypass governed MCP routes for agent execution
     - weak traceability across agent-origin requests

3. **Insufficient discovery attribution**
   - Discovery audit events defaulted to `userId: null` and
     `origin: workflow_orchestrator`, even when discovery came from an
     authenticated MCP host request.
   - Compliance risk:
     - reduced accountability
     - weaker audit evidence for regulator/internal review

### Disposition

Per the execution requirement, these gaps were corrected before broader
Batch 3 expansion continued.

## Corrective Actions Implemented

### 1) Unified MCP request authentication

- Added [request-auth.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/request-auth.ts)
- New behavior:
  - MCP host routes now authenticate through one shared bridge that supports:
    - signed-in user sessions
    - authenticated twin-key agent requests
  - normalized output includes:
    - `tenantId`
    - `userId`
    - `authType`
    - governed MCP `origin`

### 2) Discovery now uses the governed runtime

- Updated [tools route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tools/route.ts)
- New behavior:
  - `GET /api/mcp/tools` now calls `gateway.discoverTools(...)`
  - returns live runtime-discovered tools instead of bypassing the gateway
  - discovery failure is surfaced as structured MCP discovery failure output

### 3) Discovery audit attribution improved

- Updated [gateway-contract.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/gateway-contract.ts)
  and [gateway.ts](file:///Users/user/Pictures/shothik.2/shothik-web/lib/mcp/gateway.ts)
- New behavior:
  - discovery requests can now carry `userId` and `origin`
  - audit events for discovery preserve the authenticated caller context when
    provided

### 4) Invocation routes now accept governed agent principals

- Updated [tool route](file:///Users/user/Pictures/shothik.2/shothik-web/app/api/mcp/tool/route.ts)
- New behavior:
  - `POST /api/mcp/tool` authenticates through the shared MCP auth bridge
  - twin-key requests can invoke governed native tools without creating a
    parallel execution path
  - invocation continues to pass through `ServerMCPGateway`, preserving policy
    enforcement and audit generation

## In-Process Quality Audits

The following checks were performed while implementing the changes:

- ensured discovery and invocation both terminate in governed MCP gateway paths
- preserved deny-by-default behavior for unknown tool names
- preserved existing structured error mapping for blocked/failed invocations
- kept tenant/user attribution explicit rather than inferring from loose request
  metadata
- avoided introducing a second unmanaged execution surface for agents

## Post-Completion Compliance Validation

### Type-check

```bash
pnpm type-check
```

Result: `PASS`

### Focused Batch 3 route + gateway tests

```bash
pnpm exec vitest run \
  app/api/mcp/tools/route.test.ts \
  app/api/mcp/tool/route.test.ts \
  lib/__tests__/mcp-gateway.test.ts
```

Result: `12 passed`

### Existing MCP regression suites

```bash
pnpm mcp:package:validate
pnpm mcp:creative-studio:test
```

Result:

- `mcp:package:validate` — `20 passed`
- `mcp:creative-studio:test` — `20 passed`

## Standards Alignment Summary

### OWASP ASVS 5.0.0 alignment

- **V4 API and Web Service**: MCP routes validate request structure and reject
  malformed or unknown tool requests.
- **V6 Authentication / V7 Session Management**: MCP routes now accept only
  authenticated user or authenticated twin principals through a shared auth
  boundary.
- **V8 Authorization**: tool invocation remains governed by gateway policy and
  allowlisting.
- **V13 Configuration / V15 Secure Architecture**: discovery and invocation now
  share the same runtime boundary, reducing architectural drift.
- **V16 Logging and Error Handling**: discovery attribution is now preserved in
  audit events, improving traceability.

### MCP security alignment

- inbound MCP host requests are authenticated
- discovery and invocation both use governed runtime paths
- least-privilege identity attribution is preserved
- deny-by-default behavior remains intact
- auditability is improved for discovery events

## Residual Gaps And Next Actions

### Non-blocking follow-up

- Agent task execution and approval workflows under `app/api/twin/*` still
  contain bespoke business execution flows that are not yet fully routed through
  governed MCP tool invocations.
- This remains the next Batch 3 expansion target.

### Current milestone conclusion

- The current Batch 3 compliance gate for MCP host discovery/execution
  unification is **satisfied**.
- No blocker prevents progression to the next Batch 3 implementation slice.

