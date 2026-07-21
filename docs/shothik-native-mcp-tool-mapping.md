# Shothik Native MCP Tool Mapping

## Purpose

Define the next sequential MCP deliverable after the Creative Studio workflow
entry: selected Shothik-native tools must be mapped into MCP-compatible tool
definitions before packaging scaffold work begins.

This document captures:

- review alignment with the preceding phase
- measurable success criteria for this step
- technical and functional requirements
- milestone checkpoints for implementation
- validation expectations
- pending follow-up boundaries for the next phase

## Review Of Completed Deliverables

The preceding MCP phase delivered the following foundations:

1. MCP architecture definition
2. shared gateway contract
3. managed remote connector scaffold for Higgsfield
4. authenticated Creative Studio server workflow
5. user-visible Creative Studio entry point
6. focused validation for gateway, workflow, route, and UI confirmation behavior

These deliverables establish the consumer side of the first MCP slice. The next
logical step is to prepare the provider side by defining how Shothik-native
capabilities can be represented as MCP-compatible tools.

## Unresolved Action Items From The Previous Phase

- native-tool provider mapping was still pending
- packaging scaffold work had to remain deferred until native-tool mapping was explicit
- authenticated TestSprite staging smoke credentials remain externally blocked
- production rollout and governance workstreams remain higher operational priorities, but not immediate code blockers for this MCP step

## Success Criteria

This step is successful when all of the following are true:

1. a tenant-scoped Shothik native connector definition exists
2. selected internal tools are mapped to MCP-compatible descriptors with stable
   names, schemas, route references, and risk metadata
3. the mapped tool set is versioned in repo and documented as the current source
   of truth for provider-side packaging preparation
4. tests verify descriptor integrity, lookup behavior, and connector binding
5. delivery tracking documents reflect that native-tool mapping is complete and
   packaging preparation is the next sequential step

## Functional Requirements

- map a first selected subset of existing internal tools rather than every tool
  in the product
- keep the mapped set aligned with existing, active Shothik tool routes and UI
  surfaces
- use stable MCP-compatible names suitable for future packaging and host
  exposure
- preserve the route boundary for each mapped tool so provider exposure can
  reuse current server behavior
- expose enough metadata for packaging and catalog UIs, including category,
  route path, UI path, and internal tool name

## Technical Requirements

- use the existing `MCPToolDescriptor` contract rather than introducing a second
  incompatible schema
- represent Shothik-native tools behind a dedicated `shothik_native` connector
- keep mapping logic server-safe and side-effect free at this stage
- classify tool risk and mutation mode explicitly
- include JSON-schema-like input and output definitions suitable for later MCP
  provider adapters
- keep packaging-specific runtime logic out of scope for this step

## Security Requirements

- do not introduce new client-side secret handling
- keep all mapped native tools classified as read-only unless a real external or
  persistent mutation is introduced later
- flag content-sensitive tools in metadata where output integrity matters
- preserve the existing separation between provider definition and runtime
  invocation

## Selected Native Tool Set

The first mapped provider set for packaging preparation is:

- grammar checker
- summarizer
- translator
- paraphrase
- AI detector
- humanizer

These tools were selected because they already have stable route contracts and
user-facing surfaces, making them the best candidates for future MCP provider
exposure and packaged app scaffolding.

## Implementation Plan

### Milestone 1: alignment review

- review existing MCP delivery artifacts
- review unresolved follow-up items from the Creative Studio phase
- confirm that native-tool mapping is the next approved step

### Milestone 2: connector and descriptor scaffold

- create a Shothik-native connector definition
- define stable MCP-compatible names for selected tools
- map input/output schema shapes, route paths, categories, and UI links

### Milestone 3: integrity validation

- add focused tests for connector binding, descriptor uniqueness, and lookup
  helpers
- run repo-level type-check
- rerun focused MCP and Creative Studio tests to ensure this step does not
  regress the previous workflow phase

### Milestone 4: delivery transition

- update execution tracking artifacts
- record outcomes in the progress log and changelog
- declare packaging scaffold preparation as the next sequential task

## Testing Requirements

Minimum validation for this step:

1. unit tests for the native-tool registry and lookup helpers
2. type-check for all touched MCP files
3. rerun focused MCP workflow coverage from the preceding phase:
   - gateway
   - Creative Studio workflow service
   - Creative Studio API route
   - Creative Studio UI confirmation behavior

## Out Of Scope

- full MCP provider runtime transport
- host-facing packaging assets
- sunpeak inspector fixtures
- native-tool billing settlement
- arbitrary user-configurable tool exposure

## Exit Criteria

The next phase may begin when:

1. this document is versioned in repo
2. the native connector and tool registry code are committed in working state
3. focused tests and type-check pass
4. delivery docs identify packaging scaffold preparation as the next step

## Follow-Up After This Step

The next sequential deliverable is to prepare the first packaging scaffold
boundary for sunpeak, using the native tool mapping and the Creative Studio
workflow surface as the provider catalog inputs.
