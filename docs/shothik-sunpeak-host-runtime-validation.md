# Shothik Sunpeak Host Runtime Validation

## Purpose

Define the first repo-native validation layer for the next MCP packaging phase:
checking the Creative Studio package contract against host-runtime evidence for
ChatGPT and Claude.

This stage does not publish a host package yet. It adds the code and regression
surface needed to compare:

- host-readiness assertions
- workflow fixture expectations
- observed host-runtime behavior

## Scope

Implemented in this stage:

1. host-runtime evidence model for declared package hosts
2. assertion validation for:
   - authenticated access enforcement
   - confirmation-gated remote writes
   - client-secret exposure prevention
   - native support-tool availability
3. scenario validation for:
   - dry-run planning
   - confirmation-gate responses
   - confirmed execution response contracts
4. focused regression coverage for success and failure paths
5. package validation command coverage for the new validator

Still out of scope:

- live `sunpeak` inspector execution
- ChatGPT or Claude package publication
- host browser automation
- staging or production package deployment

## Code Additions

### `lib/mcp/host-runtime-evidence.ts`

- normalizes checked-in host-runtime evidence files into:
  - captured validation inputs
  - explicit blockers
  - structural errors
- keeps non-captured host observations reviewable without fabricating runtime
  scenario evidence

### `lib/mcp/host-runtime-validation.ts`

- validates all declared package hosts from the manifest
- matches host-readiness fixture assertions to runtime evidence
- checks workflow scenario observations against expected status codes and
  response-shape keys
- reports publishing blockers as deterministic validation errors

### `lib/__tests__/host-runtime-validation.test.ts`

- validates the passing baseline for both host targets
- covers missing host evidence
- covers confirmation-gate regressions
- covers response-shape drift in runtime observations

### `app/api/mcp/creative-studio/route.test.ts`

- expands route-level coverage for invalid JSON and schema failures
- covers connector configuration failures mapped to runtime-safe HTTP status
  codes

### `package.json`

- expands `pnpm mcp:package:validate` to include host-runtime validation tests
- adds `pnpm mcp:creative-studio:test` for the focused Creative Studio
  integration surface
- adds `pnpm mcp:host-runtime:validate` for deterministic validation of checked-in
  host-runtime evidence artifacts

## Validation Strategy

The validator is designed to accept real host observations later without
rewriting the packaging layer.

Expected follow-up execution flow:

1. collect runtime observations for each supported host target
2. feed those observations into the validator
3. capture failures as package publishing blockers
4. resolve mismatches before any host-facing release work begins

## Evidence Artifact Path

Host-runtime evidence is now stored under:

- `mcp-packages/creative-studio/runtime-evidence/README.md`
- `mcp-packages/creative-studio/runtime-evidence/chatgpt.json`
- `mcp-packages/creative-studio/runtime-evidence/claude.json`

Each host target has one evidence file that can represent either:

- `captured` runtime observations ready for validator input
- a non-captured blocker state such as `pending_authentication`

## Current Host Access Result

The authenticated runtime-evidence collection pass confirmed:

- `ChatGPT` now loads an authenticated shell at `https://chatgpt.com/`
- `Claude` now loads an authenticated shell at `https://claude.ai/new`
- both declared host targets are now available for authenticated runtime
  evidence capture in the current browser context
- a follow-up remediation review confirmed `Claude` core interactions are healthy:
  - composer and model selector work
  - files/connectors, Projects, and Artifacts surfaces load correctly
  - a basic prompt-send path completes successfully
- observed network noise is limited to telemetry-style tracking resources and is
  not correlated with user-facing feature failure

Current remediation result:

- the previously recorded `Claude` runtime-noise finding is reclassified as a
  documentation-only telemetry observation
- no host-readiness mismatch remains for the current Creative Studio slice

## Current Result

The repository now has both:

- an implementation-backed host-runtime validation layer
- captured authenticated evidence artifacts for the two declared host targets

This closes the authentication blocker that previously prevented runtime-evidence
capture and allows the deterministic evidence validator to run against checked-in
host observations.

Current result:

- `pnpm mcp:host-runtime:validate` can now execute against captured evidence
- `ChatGPT` passes the current host-readiness expectations
- `Claude` passes the current host-readiness expectations after the remediation
  review confirmed no core-flow degradation
