# MCP Phase 4 Release-Readiness Test Plan

Date: `2026-07-18`
Phase target: `Phase 4 - MCP release-readiness gate`
Prepared during: `Phase 3 - Host-readiness remediation`
Status: `Ready for execution planning`

## 1. Purpose

Prepare the next unit-test, integration-test, and evidence-verification coverage
set required before the Creative Studio MCP slice can enter a release-readiness
gate.

This plan stays inside the approved Creative Studio scope and builds directly on
the now-validated host-runtime evidence for `ChatGPT` and `Claude`.

## 2. Unit Test Coverage

### Priority `P0`

1. `lib/mcp/host-runtime-validation.ts`
   - verify both host targets pass when captured evidence reflects healthy core
     runtime behavior
   - verify required assertions still fail on:
     - auth bypass
     - confirmation-gate bypass
     - client-secret exposure
   - verify recommended assertions are still inspectable without becoming false
     blockers when evidence is otherwise healthy
2. `lib/mcp/host-runtime-evidence.ts`
   - verify captured evidence parsing for both hosts
   - verify structural error handling for missing evidence payloads
   - verify non-captured blocker handling remains deterministic
3. `lib/mcp/package-validation.ts`
   - verify manifest-to-fixture integrity when host evidence and package fixtures
     are consumed together during release-readiness validation

### Priority `P1`

4. `lib/mcp/package-scaffold.ts`
   - verify declared host targets remain limited to the approved host set
   - verify package metadata remains synchronized with the checked-in fixture set
5. `lib/mcp/native-tools.ts`
   - verify approved native helper tools stay stable for the Creative Studio
     slice and do not drift from the documented readiness expectations

## 3. Integration Test Coverage

### Priority `P0`

1. `app/api/mcp/creative-studio/route.ts`
   - authenticated dry-run planning
   - confirmation-gated mutation denial
   - confirmed mutation execution
   - invalid JSON handling
   - schema validation failure handling
   - connector configuration error mapping
2. `app/(primary-layout)/creative-studio/CreativeStudioClient.tsx`
   - dry-run plan rendering
   - confirmation-required UX state
   - confirmed execution result rendering
   - host-readiness or evidence-backed notes visibility if surfaced in the UI
3. `lib/mcp/gateway.ts`
   - connector resolution
   - deterministic policy evaluation
   - allowed tool execution path
   - blocked mutation path

### Priority `P1`

4. package-level validation command coverage
   - `pnpm mcp:package:validate`
   - `pnpm mcp:creative-studio:test`
   - `pnpm mcp:host-runtime:validate`
5. host-evidence regression pass
   - confirm `ChatGPT` and `Claude` runtime evidence files stay structurally
     valid and aligned to the approved workflow contract

## 4. Manual / Browser Verification Scenarios

These are not replacements for unit or integration tests, but should be ready
for the Phase 4 gate:

1. `ChatGPT`
   - authenticated shell loads
   - composer loads
   - package-related host entry assumptions remain unchanged
2. `Claude`
   - authenticated shell loads
   - Projects, Artifacts, and files/connectors entry points open successfully
   - a basic prompt-send path still works
   - telemetry-only noise does not regress into a feature-impacting failure

## 5. Exit Criteria

Phase 4 release-readiness test preparation is considered complete when:

- the above coverage map is accepted as the execution baseline
- no test case widens scope beyond the approved Creative Studio slice
- the required commands remain runnable in the current repo environment
- delivery docs reference this plan as the Phase 4 test-preparation baseline
