# MCP Platform Implementation Checklist

Date: `2026-07-18`
Primary roadmap phase: `Phase 5 - MCP Platform Enablement`
Execution mode: `Sequential`
Status: `Completed for the approved Creative Studio MCP slice`

## 1. Execution Intent

This checklist converts the already-approved MCP roadmap into the next directly
actionable execution plan for the repository.

It is aligned to the current repo state:

- MCP architecture, gateway contract, managed connector scaffold, Creative
  Studio workflow, native-tool mapping, packaging scaffold, package validation,
  and host-runtime validation code are already implemented
- the active MCP frontier is now the closeout of `Step 10`:
  packaging-specific host-runtime validation with real review/evidence and the
  next controlled host-facing release gate
- `Authenticated TestSprite smoke credentials and coverage` remains a blocked
  support lane, not the main execution lane
- GitHub live tracker synchronization remains partially blocked by token
  permissions and must be handled as a governance support lane

## 2. Current Source Of Truth

Primary references:

- `docs/delivery/current-execution-plan.md`
- `docs/delivery/current-progress-log.md`
- `docs/delivery/current-milestones.md`
- `docs/shothik-mcp-platform-architecture.md`
- `docs/shothik-mcp-gateway-contract.md`
- `docs/shothik-native-mcp-tool-mapping.md`
- `docs/shothik-sunpeak-package-validation.md`
- `docs/shothik-sunpeak-host-runtime-validation.md`

Implementation surfaces already in repo:

- `lib/mcp/gateway-contract.ts`
- `lib/mcp/gateway.ts`
- `lib/mcp/managed-connector-adapter.ts`
- `lib/mcp/runtime.ts`
- `lib/mcp/creative-studio.ts`
- `lib/mcp/host-runtime-validation.ts`
- `lib/mcp/package-scaffold.ts`
- `lib/mcp/package-validation.ts`
- `app/api/mcp/creative-studio/route.ts`
- `app/(primary-layout)/creative-studio/page.tsx`
- `mcp-packages/creative-studio/manifest.json`

## 3. Delivery Lanes

### Primary execution lane

- `MCP platform enablement`

### Blocked support lane

- `Authenticated TestSprite staging coverage`

### Governance support lane

- `GitHub tracker sync permission repair`

Execution rule:

- complete the next MCP milestone in order before starting the following MCP
  milestone
- do not pause the MCP lane for the TestSprite credential issue unless staging
  browser evidence becomes an explicit release gate for the active MCP step
- do not create a parallel MCP branch outside the approved Creative Studio
  vertical slice

## 4. Dependency Map

### Upstream dependencies already satisfied

- MCP architecture spec approved in repo
- gateway contract implemented
- managed Higgsfield connector scaffold implemented
- Creative Studio server workflow and UI entry implemented
- native tool mapping completed
- package scaffold and semantic package validation completed
- repo-native host-runtime validator implemented

### Open support dependencies

- staging-safe `PLAYWRIGHT_SMOKE_EMAIL`
- staging-safe `PLAYWRIGHT_SMOKE_PASSWORD`
- GitHub token with permission to write issue comments and sync live tracker
  evidence

### Downstream dependencies unlocked by this checklist

- host-facing MCP package release review
- Creative Studio host-runtime publication decision
- broader MCP packaging and connector rollout beyond the first vertical slice

## 5. Phase-By-Phase Checklist

### Phase 1: Step 10 closeout review

Objective:

- verify that the implemented host-runtime validator, package fixtures, and
  package rules still match the approved Creative Studio package scope before
  any host-facing execution begins

Tasks:

- [x] review `docs/shothik-sunpeak-host-runtime-validation.md` against the
      current manifest, fixture set, and route behavior
- [x] confirm declared host targets are still limited to the approved first
      package surface
- [x] verify current package scenarios still cover:
  - dry-run planning
  - confirmation-gated mutations
  - confirmed execution response shape
  - authenticated access enforcement
  - client-secret exposure prevention
- [x] confirm no new MCP files introduced drift outside the Creative Studio
      vertical slice
- [x] update the delivery log if any scope or validation expectations changed

Primary files:

- `docs/shothik-sunpeak-host-runtime-validation.md`
- `docs/shothik-sunpeak-package-validation.md`
- `mcp-packages/creative-studio/manifest.json`
- `mcp-packages/creative-studio/fixtures/*`
- `app/api/mcp/creative-studio/route.ts`

Code review requirements:

- security review for host-readiness assertions
- architecture review for scope creep or second-branch risk

QA checkpoints:

- `pnpm mcp:package:validate`
- `pnpm mcp:creative-studio:test`
- `pnpm exec tsc --noEmit`

Completion criteria:

- validator scope remains accurate
- package fixtures and host-readiness expectations are approved for runtime
  evidence collection
- no scope drift is detected

Review outcome:

- completed on `2026-07-18`
- confirmed host targets remain limited to `chatgpt` and `claude`
- confirmed fixture coverage remains limited to:
  - dry-run planning
  - confirmation-gated remote mutation
  - confirmed execution response contract
  - host-readiness assertions for auth, confirmation, secret exposure, and
    native support-tool availability
- confirmed the active MCP implementation surface remains inside the approved
  Creative Studio slice:
  - `lib/mcp/creative-studio.ts`
  - `lib/mcp/host-runtime-validation.ts`
  - `lib/mcp/package-scaffold.ts`
  - `lib/mcp/package-validation.ts`
  - `lib/mcp/connectors/higgsfield.ts`
- validation evidence:
  - `pnpm mcp:package:validate` -> passed
  - `pnpm mcp:creative-studio:test` -> passed
  - `pnpm exec tsc --noEmit` -> passed

Target window:

- `2026-07-18`

### Phase 2: Host-runtime evidence collection

Objective:

- collect and version the first real runtime evidence inputs needed to exercise
  the host-runtime validator for declared package targets

Tasks:

- [x] define the exact evidence payload shape for `ChatGPT` and `Claude`
- [x] collect initial host access observations for each declared host target
- [x] store evidence artifacts in a deterministic repo location
- [x] feed real host observations into `lib/mcp/host-runtime-validation.ts`
- [x] capture validator failures as explicit publishing blockers
- [x] record evidence provenance and collection date in delivery docs

Primary files:

- `lib/mcp/host-runtime-validation.ts`
- `lib/__tests__/host-runtime-validation.test.ts`
- `mcp-packages/creative-studio/fixtures/*`
- `docs/shothik-sunpeak-host-runtime-validation.md`

Code review requirements:

- product review for observed host behavior vs package assumptions
- security review for confirmation-gate and secret-exposure assertions

QA checkpoints:

- `pnpm mcp:package:validate`
- `pnpm exec vitest run lib/__tests__/host-runtime-validation.test.ts "app/api/mcp/creative-studio/route.test.ts"`
- rerun the focused Creative Studio UI test if any workflow contract changed

Completion criteria:

- real host evidence exists for each supported host target
- validator runs successfully or produces a bounded blocker list
- all blockers are documented with owner and remediation path

Current result:

- deterministic evidence artifacts now exist under:
  - `mcp-packages/creative-studio/runtime-evidence/chatgpt.json`
  - `mcp-packages/creative-studio/runtime-evidence/claude.json`
- exact evidence collection shape is now versioned in:
  - `lib/mcp/host-runtime-evidence.ts`
  - `scripts/validate-creative-studio-host-runtime-evidence.ts`
- current browser-backed host access observations:
  - `ChatGPT` authenticated at `https://chatgpt.com/`
  - `Claude` authenticated at `https://claude.ai/new`
- current validator result:
  - `pnpm mcp:host-runtime:validate` -> passed
  - `pnpm exec vitest run lib/__tests__/host-runtime-validation.test.ts "app/api/mcp/creative-studio/route.test.ts"` -> passed
  - `pnpm mcp:package:validate` -> passed
  - `pnpm mcp:creative-studio:test` -> passed
  - `pnpm exec tsc --noEmit` -> passed
  - bounded non-blocking mismatch recorded for `Claude`:
    - background request failures affect skills and telemetry endpoints in the
      inspected browser session
    - native support-tool availability remains recommended rather than required
      in the current fixture set

Phase 3 remediation result:

- the prior `Claude` runtime-noise finding was reclassified as a
  documentation-only telemetry observation
- no package, route, or fixture mismatch remains open for the current Creative
  Studio slice

Phase transition handoff artifacts:

- `docs/delivery/mcp-phase2-transition-report-2026-07-18.md`
- `docs/delivery/mcp-phase-transition-meeting-2026-07-18.md`
- `docs/delivery/mcp-phase3-execution-control-2026-07-18.md`
- `docs/delivery/mcp-phase3-closeout-2026-07-18.md`
- `docs/delivery/mcp-phase4-release-readiness-test-plan-2026-07-18.md`
- `docs/delivery/mcp-phase4-release-readiness-report-2026-07-18.md`

Target window:

- `2026-07-19`

### Phase 3: Host-readiness remediation

Objective:

- resolve any mismatches exposed by real host-runtime validation without
  widening the first vertical slice

Tasks:

- [ ] fix route, package, or fixture mismatches identified in Phase 2
- [ ] preserve explicit confirmation requirements for mutating creative actions
- [ ] verify that native support tools remain read-only in all host scenarios
- [ ] keep secret-handling and authenticated access assertions intact
- [ ] rerun the full focused MCP regression suite after each remediation batch

Primary files:

- `app/api/mcp/creative-studio/route.ts`
- `app/(primary-layout)/creative-studio/CreativeStudioClient.tsx`
- `lib/mcp/creative-studio.ts`
- `lib/mcp/host-runtime-validation.ts`
- `mcp-packages/creative-studio/*`

Code review requirements:

- implementation review for each host-facing contract change
- explicit sign-off that no unsafe mutation path bypasses confirmation

QA checkpoints:

- `pnpm mcp:package:validate`
- `pnpm exec vitest run lib/__tests__/package-scaffold.test.ts lib/__tests__/package-validation.test.ts lib/__tests__/native-tools.test.ts lib/__tests__/creative-studio.test.ts "app/api/mcp/creative-studio/route.test.ts" lib/__tests__/mcp-gateway.test.ts "app/(primary-layout)/creative-studio/CreativeStudioClient.test.tsx" lib/__tests__/host-runtime-validation.test.ts`
- `pnpm exec tsc --noEmit`

Completion criteria:

- all blocking host-runtime mismatches are resolved
- validator returns a release-candidate-safe result for all declared hosts
- the Creative Studio workflow still passes focused regression coverage

Target window:

- `2026-07-20`

### Phase 4: MCP release readiness gate

Objective:

- convert a technically passing package into a controlled release-candidate
  decision with documentation, governance, and evidence attached

Tasks:

- [ ] update the MCP delivery docs with runtime evidence outcomes
- [ ] record release-candidate assumptions, unresolved risks, and rollback
      boundaries
- [ ] define what remains out of scope before any public host publication
- [ ] attach final evidence links to the delivery tracker once GitHub token
      permissions are available
- [ ] refresh roadmap artifacts to mark the current MCP subphase complete

Primary files:

- `docs/delivery/current-progress-log.md`
- `docs/delivery/current-milestones.md`
- `docs/delivery/current-execution-plan.md`
- `docs/shothik-sunpeak-host-runtime-validation.md`

Code review requirements:

- governance review for evidence completeness
- release-owner review for publication readiness

QA checkpoints:

- verify latest validation command outputs are recorded in docs
- confirm no failing MCP-focused test remains unresolved

Completion criteria:

- the Creative Studio MCP package has a documented release-candidate decision
- evidence, risks, and blockers are explicitly recorded
- the next single MCP step is identified without spawning a parallel plan

Target window:

- `2026-07-21`

### Phase 5: Controlled host-facing execution

Objective:

- begin limited host-facing package execution only after the release-readiness
  gate is complete

Tasks:

- [ ] run limited ChatGPT and Claude host-facing validation in the approved
      execution window
- [ ] capture observed behavior, rejection reasons, and UX inconsistencies
- [ ] refine package metadata, host instructions, and workflow boundaries as
      needed
- [ ] decide whether the next step is:
  - broader Creative Studio release
  - connector hardening
  - second MCP workflow slice

Primary files:

- `mcp-packages/creative-studio/manifest.json`
- `docs/shothik-sunpeak-host-runtime-validation.md`
- any host-facing runtime evidence artifacts added in Phase 2

Code review requirements:

- final publication review
- security confirmation that host-facing execution did not introduce secret or
  policy regressions

QA checkpoints:

- rerun `pnpm mcp:package:validate`
- rerun the focused Creative Studio integration suite after any host-facing
  package change

Completion criteria:

- host execution results are documented
- package behavior is stable enough for the next approved release decision
- the follow-up MCP roadmap slice is explicitly selected

Target window:

- `2026-07-22` onward, only if Phases 1-4 close cleanly

## 6. Support Lane Checklist

### Blocked support lane: TestSprite staging credentials

Objective:

- unblock authenticated staging coverage without interrupting the primary MCP
  implementation lane

Tasks:

- [ ] provision `PLAYWRIGHT_SMOKE_EMAIL`
- [ ] provision `PLAYWRIGHT_SMOKE_PASSWORD`
- [ ] validate credential storage path and access method
- [ ] run authenticated TestSprite coverage against
      `https://staging.shothikgpt.com`
- [ ] record credential-safe evidence in delivery docs

Owner:

- `Ahsan Habib (@ahsanhab919-ux)`

Dependency:

- external credential provisioning

Exit criteria:

- authenticated staging smoke passes without Vercel protection blockers

### Governance support lane: GitHub tracker sync permission repair

Objective:

- restore the ability to push local delivery evidence into live GitHub tracker
  issues

Tasks:

- [ ] identify the missing GitHub token scope causing `Resource not accessible
      by personal access token`
- [ ] provision a token or auth method with issue-comment write access
- [ ] replay failed tracker-sync actions for MCP and rollout workstreams
- [ ] confirm local governance artifacts and remote issue comments match

Owner:

- `Ahsan Habib (@ahsanhab919-ux)`

Dependency:

- GitHub authentication permissions outside current repo code

Exit criteria:

- issue comments can be written successfully from the current execution
  environment

## 7. Milestone Timeline

| Milestone | Date | Scope | Exit gate |
| --- | --- | --- | --- |
| M0 | `2026-07-18` | publish this checklist | MCP phase control is versioned in repo |
| M1 | `2026-07-18` | Step 10 closeout review | package scope and validator expectations reapproved |
| M2 | `2026-07-19` | collect host-runtime evidence | real host evidence is versioned and validated |
| M3 | `2026-07-20` | remediate host-readiness gaps | focused MCP validation is green after fixes |
| M4 | `2026-07-21` | MCP release-readiness gate | release-candidate decision is documented |
| M5 | `2026-07-22+` | controlled host-facing execution | host results recorded and next MCP slice selected |

## 8. Mandatory Code Review Gates

- no MCP phase closes without:
  - one implementation review
  - one security review for confirmation, auth, and secret boundaries
  - one delivery/governance review confirming docs and evidence are updated
- any mutation-capable tool exposure must be reviewed for:
  - confirmation gate enforcement
  - audit event coverage
  - tenant isolation
- any package metadata change that affects host expectations must re-run package
  validation before approval

## 9. Mandatory QA Validation Matrix

Run after any material MCP change in the active lane:

- `pnpm mcp:package:validate`
- `pnpm mcp:creative-studio:test`
- `pnpm exec tsc --noEmit`

Run after route, workflow, or package-contract changes:

- `pnpm exec vitest run lib/__tests__/package-scaffold.test.ts lib/__tests__/package-validation.test.ts lib/__tests__/native-tools.test.ts lib/__tests__/creative-studio.test.ts "app/api/mcp/creative-studio/route.test.ts" lib/__tests__/mcp-gateway.test.ts "app/(primary-layout)/creative-studio/CreativeStudioClient.test.tsx" lib/__tests__/host-runtime-validation.test.ts`

Run after host-facing evidence or behavior adjustments:

- rerun the full MCP-focused validation suite above
- confirm the host-runtime validator result is reflected in docs before moving
  to the next phase

## 10. Risk Register

| ID | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | host-runtime evidence reveals contract drift between package assumptions and real host behavior | High | keep the first vertical slice narrow and remediate before any public publication |
| R2 | package changes widen scope beyond Creative Studio and create a second MCP roadmap branch | High | reject any feature addition that is not required to close the current host-runtime phase |
| R3 | external TestSprite credential blocker distracts the active MCP lane | Medium | keep TestSprite as a support lane and only escalate if it becomes an explicit release gate |
| R4 | GitHub token permissions prevent remote evidence sync | Medium | keep repo docs as the source of truth until write-capable auth is restored |
| R5 | unrelated vendor-workspace discovery pollutes repo-wide validation | Medium | preserve root TypeScript and Vitest exclusions for the `brainstom ` workspace |

## 11. Completion Statement

This checklist is complete and usable when:

- it is versioned in repo
- the delivery roadmap references it as the active MCP execution-control
  document
- the next implementation action starts with `Phase 1: Step 10 closeout review`
- the support-lane blockers remain visible without displacing the primary MCP
  sequence
