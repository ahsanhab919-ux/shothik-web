# Current Execution Plan

## Objective

Execute the remaining project-enablement work in the following dependency order:

1. Batch 0: Stabilization and control gate
2. Batch 1: Auth and runtime foundation
3. Batch 2: Native tool runtime enablement
4. Batch 3: Agent-system unification
5. Batch 4: Writing workflow consolidation
6. Batch 5: Publishing workflow completion
7. Batch 6: End-to-end certification and release readiness

Execution rule: advance only the active batch and its prerequisite remediation.
Do not reopen closed July 18 delivery lanes as parallel branches unless a newly
verified blocker invalidates their acceptance evidence.

Milestone rollup: `docs/delivery/current-milestones.md`
Progress log: `docs/delivery/current-progress-log.md`
Execution framework: `docs/delivery/sequential-prioritization-framework.md`

## Active Control Gate

### Batch 6: End-to-end certification and release readiness

Current focus:

1. execute one evidence-backed certification pass across auth, native tools,
   agents, and the writing-to-publishing workflow
2. refresh release-readiness reporting and runbooks so they match the current
   post-Batch-5 runtime behavior
3. verify live-provider prerequisites for PublishDrive and Stripe, then record
   a final go/no-go recommendation for release readiness

Active milestone: `2026-07-21` Batch 6 certification kickoff

Responsible team:

- delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
- implementation owner: `TRAE/Codex pair-programming agent`
- reviewer and approver: `Project reviewer / user`

Phase KPIs:

- `100%` of release-readiness reports reflect the current validated roadmap
  state through Batch 5 completion and Batch 6 blockers
- `100%` of Batch 6 control artifacts identify the missing provider secrets and
  smoke credentials required for live certification
- `100%` pass rate on the release-readiness reporting tests and generator run

Regular check-ins:

1. precheck checkpoint: certification prerequisites, provider availability, and
   smoke-credential requirements are verified and logged
2. implementation checkpoint: execution plan and release-readiness reporting are
   updated to the current Batch 6 state
3. validation checkpoint: readiness-report unit tests and generator execution
   pass cleanly
4. delivery checkpoint: refreshed Batch 6 artifacts are ready for stakeholder
   review and the next certification run

Exit criteria:

- current execution plan and release-readiness reports reflect Batch 6 as the
  active gate
- generated readiness artifacts identify completed validation through Batch 5
  plus the remaining live-provider and smoke-credential blockers
- Batch 6 certification tooling is review-ready for the next credentialed
  release-readiness pass

### Confirmed ready

- Batch 0 stabilization and control gate is complete
- Batch 1 auth and runtime foundation is complete
- Batch 2 native tool runtime enablement is complete
- Batch 3 compliance gate is complete
- Batch 3 `task:*` MCP unification is complete
- Batch 3 `forum:create` MCP unification is complete
- Batch 3 `forum:post` MCP unification is complete
- Batch 3 `book:write` MCP unification is complete
- Batch 3 `book:publish` MCP unification is complete
- Batch 3 `community:preview` MCP unification is complete
- Batch 4 writing workflow consolidation is complete
- Batch 5 publishing workflow completion is complete
- production auth/chat rollout is closed with recorded evidence
- Books Phase 1 staging migration is closed with recorded evidence
- Projects and writing persistence phase is closed with recorded evidence
- Creative Studio MCP slice is closed with recorded evidence

### Confirmed blocked

- GitHub live tracker sync remains externally blocked on write-capable token
  permissions

## Phase 1: Production Auth And Chat Rollout

### Status

Completed on production as of `2026-07-18`.

### Priority

P0

### Completed items

- `pnpm audit:vercel:production` passed before promotion
- compatibility values were confirmed as still required for the current
  production build:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `STRIPE_SECRET_KEY`
  - `API_KEY_SALT`
- production deployment pipeline was repaired with:
  - `packageManager` pinning to `pnpm@11.10.0`
  - explicit `pnpm-workspace.yaml` build approvals
  - `.vercelignore` exclusions for large local caches
- production chat runtime was hardened for the live database and provider shape:
  - chat ownership queries now support both `auth_user_id` and legacy `user_id`
  - Gemini chat runtime now falls back to `GEMINI_API_KEY`
  - deprecated Gemini model handles now normalize to supported aliases
  - chat message retrieval now stays within the enforced `limit=100` cap
- latest successful production deployment:
  - `https://shothik-9rw3ebjso-shothik.vercel.app`
  - aliased at `https://www.shothikgpt.com`
- post-promotion SQL verification is clean:
  - `chat_conversations`: `2` total, `0` missing `auth_user_id`
  - `chat_messages`: `0` total, `0` missing `auth_user_id`
  - mismatched conversation/message ownership rows: `0`
- authenticated production smoke passed with a disposable verified account:
  - login and post-login routing succeeded
  - `/agents/chat` loaded successfully
  - conversation create/list worked
  - message retrieval worked at `limit=100`
  - prompt execution completed successfully with `gemini-flash-latest`
- automated production smoke passed:
  - `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers PLAYWRIGHT_BASE_URL=https://www.shothikgpt.com PLAYWRIGHT_SMOKE_EMAIL=... PLAYWRIGHT_SMOKE_PASSWORD=... pnpm exec playwright test e2e/smoke.spec.ts --reporter=line`
  - result: `16 passed`

### Success metrics

- production deploy completes without rollback
- chat ownership migration completes with `0` mismatched rows
- authenticated chat create/read/delete succeeds
- post-login route lands on a valid destination

All success metrics are now satisfied on production.

### Dependency owners

- release owner: `Ahsan Habib (@ahsanhab919-ux)`
- platform owner: `Ahsan Habib (@ahsanhab919-ux)`

## Phase 2: Delivery Governance Hardening

### Status

Completed on `2026-07-18`.

### Priority

P1

### Completed items

- dedicated GitHub tracker issues created and synchronized
- owner assignment normalized to `Ahsan Habib (@ahsanhab919-ux)`
- matrix exports regenerated from live issue registry
- formal launch-gate approver roster recorded in
  `docs/delivery/launch-gate-governance-2026-07-18.md`
- unresolved dependency items moved into issue-aligned checklist entries in the
  governance refresh
- delivery-matrix generation updated so named approvers replace acting
  placeholders in exported launch-gate records
- release-window approval recorded for `AGT-01` with production rollout
  evidence and post-promotion verification references

### Success metrics

- all active workstreams have named gate owners
- all launch-gate failures have remediation owners and target dates
- delivery summary shows reduced unresolved governance gaps on next refresh

All success metrics are satisfied by the `2026-07-18` governance refresh.

## Parallel Operational Track: TestSprite Staging Automation

### Status

Public staging target and persistent cloud bootstrap completed; authenticated
journeys remain blocked on test credentials.

### Priority

P1

### Completed items

- `staging.shothikgpt.com` is live and no longer redirects through Vercel SSO
- `pnpm testsprite:project` successfully bootstraps and updates the persistent
  TestSprite cloud project for `https://staging.shothikgpt.com`
- the bootstrap flow now rejects protected Vercel preview URLs and normalizes
  CLI `projectId` responses into stable local metadata
- readiness reporting now shows `Cloud project configured: yes`

### Remaining tasks

1. provision `PLAYWRIGHT_SMOKE_EMAIL`
2. provision `PLAYWRIGHT_SMOKE_PASSWORD`
3. execute authenticated TestSprite coverage against staging
4. if preview protection is re-enabled later, keep staging public through
   `Advanced Deployment Protection` exceptions or a separate public staging
   project

### Success metrics

- public staging remains reachable at `https://staging.shothikgpt.com`
- TestSprite cloud project stays synchronized with the staging target
- authenticated login/chat smoke coverage runs without interactive Vercel
  protection blockers

## Phase 3: Shothik Books Phase 1

### Status

Completed on staging. The Phase 1 internal marketplace slice now runs on the
InsForge schema/service/API path for drafts, published catalog, purchases,
owned-library access, sales reporting, credit balance reads, and admin
moderation.

### Priority

P1

### Completed tasks

1. translated the Phase 1 MVP spec into backend, frontend, and QA slices
2. implemented the InsForge target schema for:
   - creator book drafts
   - published books
   - purchases
   - owned library access
   - moderation state transitions
3. cut over the Phase 1 marketplace/detail/library/sales/admin surfaces away
   from legacy Convex book handlers
4. applied the staging migration and provisioned the required storage buckets
5. added focused regression tests and re-ran type-check validation

### Success metrics

- staging InsForge schema and storage are live for Books Phase 1
- Phase 1 launch surfaces read/write through InsForge-backed services and routes
- focused tests pass and repo-level type-check passes after the cutover

## Phase 4: Projects And Writing Persistence

This is the active Phase 2 launch slice for the broader backend migration after
Books Phase 1.

Primary plan:

- `docs/shothik-phase2-projects-writing-plan.md`
- `docs/delivery/current-phase-execution-control-2026-07-18.md`
- `docs/delivery/current-phase-progress-report-2026-07-18.md`

Current status:

- dependency mapping complete
- source Convex module confirmed as `convex/projects.ts`
- InsForge `projects` and `project_versions` schema, service, routes, and
  authenticated `useProjectsStore.ts` cutover are implemented
- focused validation now covers project creation, version listing, version
  restore, and owner-guarded service behavior
- browser parity validation now passes for create, save, reopen, version
  restore, and delete across Chrome Stable, Firefox Stable, Safari-equivalent
  WebKit, and Edge Stable
- the first highest-value residual Convex removal slice is complete for the
  active editor path:
  - `components/writing-studio/PolishedWriteView.tsx`
  - `components/writing-studio/nobel/CharacterPanel.tsx`
  - `hooks/useProjectCharacters.ts`
  - `hooks/useConvexAutosave.ts` removed
- the second highest-value residual Convex removal slice is complete for the
  legacy writing-studio shell:
  - `components/writing-studio/IntegratedWritingStudio.tsx`
  - `components/writing-studio/containers/ProjectContainer.tsx`
- the third highest-value residual Convex removal slice is complete for publish
  surfaces:
  - `components/tools/writing-studio/workspace/publish/NotificationBell.jsx`
  - `components/tools/writing-studio/workspace/publish/DistributionManager.jsx`
  - `components/tools/writing-studio/workspace/publish/TaxInformationStep.jsx`
  - `components/books/DistributionStatusPanel.tsx`
  - `app/api/publish/submit/route.ts`
  - `app/api/publish/status/route.ts`
  - `app/api/webhooks/publishdrive/route.ts`
- the fourth highest-value residual Convex removal slice is complete for publish
  earnings and payout surfaces:
  - `hooks/useEarnings.js`
  - `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
  - `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`
  - `app/api/publish/earnings/route.ts`
  - `app/api/publish/payouts/route.ts`
  - `app/api/publish/payout-accounts/route.ts`
  - `app/api/stripe/connect/route.ts`
  - `app/api/stripe/payout/route.ts`
- the fifth highest-value residual Convex removal slice is complete for backend
  compatibility bridges:
  - `app/api/writing-studio/notify-master/route.ts`
  - `lib/writing-studio/buildStore.ts`
  - `app/api/latex/status/[buildId]/route.ts`
  - `lib/twin/insforge-twin-service.ts`
  - `lib/publishing/insforge-render-service.ts`
- the sixth highest-value residual Convex removal slice is complete for the
  final active global bridge:
  - `app/api/auth/convex-token/route.ts`
  - `lib/convex-auth.ts`
  - `app/api/.well-known/jwks.json/route.ts`
  - `providers/ConvexClientProvider.jsx`
  - hidden dependent callers migrated in the same slice:
    `lib/twin-api-auth.ts`, `lib/twin-route-guard.ts`,
    `app/api/books/export/convert/route.ts`,
    `app/api/books/export/validate/route.ts`,
    `i18n/useLoadConvexLocale.ts`, and `i18n/useSyncLocaleToConvex.ts`
- Phase 4 is now complete; remaining work returns to the broader roadmap

Immediate next steps:

1. delivery governance hardening
2. authenticated TestSprite staging coverage after credentials are provisioned
3. maintain non-blocking cleanup follow-ups from the production rollout:
   - remove the disposable production test account if it should not persist
   - audit residual Convex console noise observed during broader authenticated browsing

## Phase 4: Coverage And Release Automation

### Status

Completed.

### Priority

Completed

### Required tasks

1. restore `pnpm test:coverage`
2. validate `pnpm test`, `pnpm type-check`, and `next build`
3. capture timing data for:
   - type-check
   - coverage
   - build
4. record deviations and unresolved bottlenecks in a post-implementation report

### Success metrics

- coverage command passes locally
- type-check passes
- build passes with documented env assumptions
- benchmark timings are captured for future regression comparison

## Phase 5: MCP Platform Enablement

### Status

Completed for the approved Creative Studio MCP slice. The release-readiness gate
passed, and no parallel implementation branch should be reopened inside this
phase unless a new blocker invalidates the gate evidence.

Active execution control:

- `docs/delivery/mcp-platform-implementation-checklist-2026-07-18.md`
- `docs/delivery/mcp-phase2-transition-report-2026-07-18.md`
- `docs/delivery/mcp-phase-transition-meeting-2026-07-18.md`
- `docs/delivery/mcp-phase3-execution-control-2026-07-18.md`
- `docs/delivery/mcp-phase3-closeout-2026-07-18.md`
- `docs/delivery/mcp-phase4-release-readiness-test-plan-2026-07-18.md`
- `docs/delivery/mcp-phase4-release-readiness-report-2026-07-18.md`

### Priority

P1

### Objective

Add first-class MCP connection capability and MCP app packaging to Shothik
without replacing the existing InsForge-backed application architecture.

### Architecture direction

- keep InsForge, Vercel, and the existing `/api/tools/*` stack as the core
  application backend
- add a Shothik MCP gateway for remote MCP connectors, policy enforcement,
  orchestration, and auditing
- use sunpeak for MCP app packaging, local inspector workflows, host-runtime
  testing, and live/eval validation
- treat Higgsfield MCP as the first reference external connector for creative
  media workflows
- keep OpenRouter as the default orchestration provider for multi-tool routing

### Required tasks

1. create and approve the MCP architecture spec:
   - `docs/shothik-mcp-platform-architecture.md`
2. define and version the MCP gateway contract:
   - `docs/shothik-mcp-gateway-contract.md`
   - `lib/mcp/gateway-contract.ts`
3. define the first vertical slice:
   - connector: Higgsfield MCP
   - planner: OpenRouter
   - packaging/testing: sunpeak
   - user-facing workflow: Shothik Creative Studio
4. generalize the current MCP client implementation into a multi-connector
   gateway contract:
   - connector registry
   - capability discovery
   - tool invocation policy
   - audit logging
   - secret resolution and storage boundaries
5. define how selected Shothik-native tools map to MCP tool definitions
   - `docs/shothik-native-mcp-tool-mapping.md`
   - `lib/mcp/connectors/shothik-native.ts`
   - `lib/mcp/native-tools.ts`
6. scaffold the first packaged MCP app surface and its testing harness
   - `docs/shothik-sunpeak-packaging-scaffold.md`
   - `lib/mcp/package-scaffold.ts`
   - `mcp-packages/creative-studio/manifest.json`
   - `mcp-packages/creative-studio/fixtures/creative-studio-smoke.json`
7. validate the first slice with inspector tests, basic e2e coverage, and
   production-readiness constraints
   - `docs/shothik-sunpeak-package-validation.md`
   - `lib/mcp/package-validation.ts`
   - `mcp-packages/creative-studio/fixtures/creative-studio-confirmed-run.json`
   - `mcp-packages/creative-studio/fixtures/creative-studio-chatgpt-readiness.json`
   - `mcp-packages/creative-studio/fixtures/creative-studio-claude-readiness.json`

### Success metrics

- the MCP architecture is versioned in repo and aligned with the existing
  delivery plan
- one approved vertical slice is defined end to end without creating a second
  competing plan
- connector security, policy, and audit boundaries are explicit before
  implementation starts
- the repo has a clear path to package at least one Shothik workflow as an MCP
  app

### Current execution step

1. update the unified delivery plan and milestone tracker
2. write the MCP platform architecture spec
3. define and review the MCP gateway contract
4. scaffold the first managed connector adapter and server-side gateway
5. integrate the first server-side Creative Studio workflow through the gateway
6. implement the first user-visible Creative Studio workflow entry point
7. define selected Shothik-native tools as MCP-compatible tool definitions
8. prepare the first packaging scaffold boundary for sunpeak
9. add expanded inspector fixtures and package-focused validation
10. implement packaging-specific host-runtime validation and collect runtime
    evidence before host-facing package release work begins

Immediate next action:

1. advance to the next roadmap item after MCP platform enablement:
   `coverage and release automation repair`
2. keep `Authenticated TestSprite smoke credentials and coverage` as a blocked
   support lane
3. keep GitHub live tracker sync as a governance support lane until token
   permissions are restored
