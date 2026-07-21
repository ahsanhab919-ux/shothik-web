# Shothik Sunpeak Packaging Scaffold

## Purpose

Define and version the first packaging scaffold boundary for the Shothik
Creative Studio MCP slice before adding live `sunpeak` inspector execution,
host-runtime packaging, or deployment-specific assets.

This step converts the completed MCP workflow and native tool mapping into a
reviewable packaging scaffold with deterministic manifests, fixtures, and
validation hooks.

## Review Alignment

Completed inputs from the preceding phases:

1. MCP architecture definition
2. gateway contract definition
3. managed Higgsfield connector scaffold
4. Creative Studio server workflow
5. Creative Studio user-visible entry point
6. Shothik native MCP tool mapping

These inputs provide everything needed for a packaging boundary, but not yet a
host-ready package. This step therefore focuses on scaffold readiness only.

## Success Criteria

This packaging scaffold step is successful when:

1. a versioned Creative Studio package manifest exists in repo
2. a deterministic code builder produces the same manifest as the checked-in
   package artifact
3. at least one package-focused fixture exists for pre-host validation
4. the scaffold references both the Creative Studio workflow boundary and the
   approved native tool catalog
5. regression checks pass for the scaffold and the existing MCP workflow slice
6. delivery docs identify inspector-fixture expansion as the next packaging task

## Functional Requirements

- define a package boundary for the Creative Studio slice
- reference the current UI route and API workflow route
- declare the remote creative connector and required native support tools
- define the initial host targets intended for future packaging
- provide at least one deterministic smoke fixture covering planning and
  confirmation-gated execution

## Technical Requirements

- keep the scaffold in repo as versioned source artifacts
- keep the scaffold deterministic and testable without external packaging tools
- avoid introducing host-runtime or bundling logic in this step
- keep the scaffold aligned with the native MCP tool registry and Creative
  Studio workflow paths
- provide a package validation command suitable for review-time verification

## Security Requirements

- keep package metadata free of secrets
- continue to require explicit confirmation for remote mutating creative actions
- keep native tools marked read-only in the scaffold
- record required runtime environment without embedding values

## Deliverables

- `lib/mcp/package-scaffold.ts`
- `mcp-packages/creative-studio/manifest.json`
- `mcp-packages/creative-studio/fixtures/creative-studio-smoke.json`
- `mcp-packages/creative-studio/README.md`
- `lib/__tests__/package-scaffold.test.ts`
- `package.json` validation script: `pnpm mcp:package:validate`

## Milestone Checkpoints

### Milestone 1: package boundary definition

- define Creative Studio package metadata
- bind the package to the approved remote connector and native tool catalog
- declare review status and security expectations

### Milestone 2: fixture preparation

- add a dry-run planning fixture
- add a confirmation-gate fixture
- keep fixtures stable enough for later `sunpeak` inspector execution

### Milestone 3: validation and regression

- validate code-generated manifest parity with checked-in package files
- rerun focused MCP tests to ensure the packaging scaffold does not regress the
  workflow slice
- run repo-level type-check

## Testing Requirements

Minimum validation for this step:

1. package scaffold parity test
2. fixture-to-manifest integrity test
3. focused MCP regression suite
4. repo-level type-check

## Out Of Scope

- live `sunpeak` inspector execution
- host-specific package bundle generation
- ChatGPT or Claude deployment publishing
- package analytics or billing settlement
- host-runtime browser automation

## Exit Criteria

The next packaging phase may begin when:

1. the scaffold manifest and fixture are versioned in repo
2. package validation passes
3. MCP regression validation passes
4. the execution plan advances to inspector fixtures and package-focused
   validation expansion

## Next Step

After review of this scaffold, the next sequential packaging step is to add
expanded inspector fixtures and package-focused validation that can later be run
through `sunpeak` before host-runtime validation begins.
