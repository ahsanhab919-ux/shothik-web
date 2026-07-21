# Current Progress Log

## Review Baseline

Date: `2026-07-21`

This log records the current review of all incomplete workstreams, their
priority, acceptance criteria, active risks, and the most recent execution
updates. It is intended to be read alongside:

- `docs/delivery/current-execution-plan.md`
- `docs/delivery/current-milestones.md`

## Pending Work Review

### 1. Batch 0: Stabilization and control gate

- Priority: `P0`
- Status: `Completed`
- Dependency: approved batch plan and audit-driven control reset
- Acceptance criteria:
  - tracked InsForge linkage files are sanitized and contain no committed API keys
  - current delivery control documents reflect the active batch sequence and
    actual blocker state
  - Batch 1 entry criteria are explicit and testable
- Current risk:
  - closed; monitor only for documentation drift during later batches

### 2. Batch 1: Auth and runtime foundation

- Priority: `P0`
- Status: `Completed`
- Dependency:
  - authoritative staging `DATABASE_URL`
  - localhost OAuth session persistence remediation
- Acceptance criteria:
  - `/api/projects` succeeds against the active InsForge schema
  - password sign-in and Google OAuth both establish durable protected sessions
  - authenticated smoke can reach `/agents/chat` and post-login project-aware
    routing without degraded backend fallbacks
- Current risk:
  - closed; preserve PKCE verifier cleanup and redirect-preservation coverage

### 3. Batch 2: Native tool runtime enablement

- Priority: `P1`
- Status: `Completed`
- Dependency: Batch 1 complete
- Acceptance criteria:
  - selected Shothik-native tools are executable through the governed MCP path
  - provider discovery and invocation routes exist and are authenticated
  - audit and policy boundaries are enforced during tool execution
- Current risk:
  - closed; maintain parity between native adapter routing and public MCP host
    exposure rules

### 4. Batch 3: Agent-system unification

- Priority: `P1`
- Status: `Completed`
- Dependency: Batch 2 complete
- Acceptance criteria:
  - twin/agent execution uses the approved governed tool runtime
  - discovery endpoints resolve to live routes
  - task execution and approval flows are traceable and durable
- Current risk:
  - closed; preserve governed runtime parity and internal-only host exposure
    rules during Batch 4 integration work

### 5. Batch 4: Writing workflow consolidation

- Priority: `P1`
- Status: `Completed`
- Dependency: Batches 1 through 3 complete
- Acceptance criteria:
  - writing project outputs can become publishable draft inputs without manual
    metadata re-entry
  - project, planner, and manuscript contracts are aligned
  - mixed backend ownership is reduced on the active authoring path
- Current risk:
  - closed; preserve project-linked draft bootstrap and publish-mode persistence
    on future Batch 5 changes

### 6. Batch 5: Publishing workflow completion

- Priority: `P1`
- Status: `Completed`
- Dependency: Batch 4 complete
- Acceptance criteria:
  - creator, moderation, distribution, access, sales, earnings, and payout
    flows behave as one continuous workflow
  - legacy backend split is removed from the active publishing path
  - high-risk commerce and moderation routes gain direct regression coverage
- Current risk:
  - live provider certification still depends on environment secrets for
    PublishDrive and Stripe, which are unset in the local precheck environment

### 7. Batch 6: End-to-end certification and release readiness

- Priority: `P0`
- Status: `Pending`
- Dependency: Batches 1 through 5 complete
- Acceptance criteria:
  - unit, integration, browser, and workflow certification artifacts exist for
    auth, native tools, agents, and book publishing
  - current reports and runbooks match the implemented runtime behavior
  - final go/no-go status is evidence-backed
- Current risk:
  - there is currently no single certification pass covering the full
    agent-enabled writing-to-publishing loop

### 8. GitHub live tracker sync permission repair

- Priority: `P1`
- Status: `Blocked`
- Dependency: restore write-capable GitHub token permissions in the current environment
- Acceptance criteria:
  - delivery tracker issue-comment sync succeeds without `Resource not accessible`
  - local delivery evidence remains mirrored to the remote tracker after the next refresh
- Current risk:
  - local delivery artifacts remain the source of truth until permission repair is completed

## Latest Execution Updates

### 2026-07-21: Batch 6 release-readiness control artifacts refreshed

- Milestone: Batch 6 — certification control-layer kickoff
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- Completed deliverables:
  - refreshed active Batch 6 control gate:
    `docs/delivery/current-execution-plan.md`
  - refreshed release-readiness model:
    `scripts/lib/release-readiness-report.mjs`
  - refreshed reporting validation:
    `test/release-readiness-report.test.ts`
  - generated Batch 6 readiness artifacts:
    `docs/reports/release-readiness-milestones-2026-07-21.md`
    `docs/reports/test-report-2026-07-21.md`
    `docs/reports/functional-acceptance-2026-07-21.md`
- Key outcomes:
  - Batch 6 is now the active control gate in the execution plan
  - generated readiness reports now reflect the current roadmap state through
    Batch 5 completion instead of the stale July 18 baseline
  - the release-readiness model now records the active blockers for live
    certification: authenticated smoke credentials, PublishDrive secrets,
    Stripe secrets, and GitHub tracker token repair
- Validation executed:
  - `pnpm exec vitest run test/release-readiness-report.test.ts`
  - `pnpm run report:readiness`
  - `pnpm exec tsc --noEmit --pretty false`
- Outcome:
  - Batch 6 certification tooling is synchronized and ready for the next
    credentialed release-readiness pass
  - release-status messaging now correctly reports a non-go state until live
    certification prerequisites are provisioned

### 2026-07-21: Batch 6 go/no-go decision module added

- Milestone: Batch 6 — release decision artifact generation
- Completed deliverables:
  - go/no-go report model:
    `scripts/lib/release-go-no-go-report.mjs`
  - go/no-go generator:
    `scripts/generate-release-go-no-go.mjs`
  - package command:
    `package.json` (`report:go-no-go`)
  - validation suite:
    `test/release-go-no-go-report.test.ts`
  - generated decision artifact:
    `docs/reports/release-go-no-go-2026-07-21.md`
- Key outcomes:
  - Batch 6 now has one generated decision artifact that consolidates the
    current release decision, evidence, hard blockers, informational tracker
    blockers, and next actions
  - hard release blockers are now separated from tracker-level blocked items so
    the decision engine can model both `GO` and `NO_GO` states correctly
- Validation executed:
  - `pnpm exec vitest run test/release-readiness-report.test.ts test/release-go-no-go-report.test.ts`
  - `pnpm run report:go-no-go`
  - `pnpm exec tsc --noEmit --pretty false`
- Outcome:
  - the Batch 6 reporting pipeline now produces a review-ready go/no-go artifact
    for stakeholder approval and final certification tracking

### 2026-07-21: Batch 5 publishing workflow completion completed

- Milestone: Batch 5 — publishing workflow completion
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- Pre-execution checks:
  - verified Batch 4 completion and refreshed delivery controls before Batch 5
    edits
  - verified focused publish/moderation test coverage was present for the active
    routes
  - verified local provider resource availability and recorded the anomaly:
    `PUBLISHDRIVE_ENABLED`, `NEXT_PUBLIC_PUBLISHDRIVE_ENABLED`,
    `PUBLISHDRIVE_WEBHOOK_SECRET`, and `STRIPE_SECRET_KEY` are unset in the
    current local environment
- KPIs for this slice:
  - `100%` of active author review flows now capture distribution consent before
    distribution submission
  - `100%` of active publish-status tracking now derives from the real book and
    distribution state model
  - `0` legacy Convex dependencies remain on the active ONIX export path
  - `100%` pass rate on focused publish/moderation/payout regressions plus repo
    type-check
- Completed deliverables:
  - author review consent persistence:
    `components/tools/writing-studio/workspace/publish/PublishWizard.jsx`
    `components/tools/writing-studio/workspace/publish/ReviewSubmit.jsx`
  - canonical publish-status tracking:
    `components/tools/writing-studio/workspace/publish/StatusTracker.jsx`
  - shared Stripe payout execution:
    `lib/books/stripe-payout-service.ts`
    `app/api/publish/payouts/route.ts`
    `app/api/stripe/payout/route.ts`
  - legacy ONIX bridge removal:
    `app/api/publish/onix/route.ts`
  - direct regression coverage:
    `app/api/publish/onix/route.test.ts`
    `app/api/publish/payouts/route.test.ts`
    `app/api/stripe/payout/route.test.ts`
    `components/tools/writing-studio/workspace/publish/ReviewSubmit.test.jsx`
- Key technical decisions:
  - distribution consent is captured on the author review step and persisted with
    the book draft so later distribution submission does not fail on a missing
    consent flag
  - the publish tracker now renders against real moderation/distribution states
    instead of unsupported legacy UI-only states like `in_review` and
    `uploading`
  - Stripe payout execution is centralized in one shared service used by both
    `/api/publish/payouts` and `/api/stripe/payout`
  - the shared Stripe service now fails closed with an explicit `503` when the
    provider secret is unavailable, preventing ambiguous partial execution
  - ONIX export now uses InsForge-backed drafts and no longer depends on the
    legacy Convex publishing path
- Issues encountered and resolutions:
  - local provider-secret precheck failed because PublishDrive and Stripe
    environment variables are unset in the current environment; resolved in code
    by preserving mock/local distribution behavior and hardening Stripe execution
    with explicit fail-closed handling
  - the active publish-status UI still referenced unsupported legacy states;
    resolved by aligning it to the real moderation/distribution lifecycle and
    distribution status polling contract
- Validation executed:
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec vitest run app/api/publish/payouts/route.test.ts app/api/stripe/payout/route.test.ts app/api/publish/onix/route.test.ts app/api/publish/submit/route.test.ts app/api/publish/status/route.test.ts app/api/admin/books/route.test.ts app/api/admin/books/stats/route.test.ts components/tools/writing-studio/workspace/publish/ReviewSubmit.test.jsx`
- Outcome:
  - the active author publishing path now captures consent, renders the real
    lifecycle state, executes Stripe payouts through the publishing lane, and no
    longer uses Convex for ONIX export
  - Batch 5 publishing workflow completion is closed in code and regression
    coverage, with live provider certification deferred to Batch 6 because the
    local environment lacks external provider secrets
- Remaining blockers:
  - GitHub live tracker sync remains externally blocked on write-capable token
    permissions
  - Batch 6 still needs live environment certification for PublishDrive and
    Stripe secrets

### 2026-07-21: Batch 4 writing workflow consolidation completed

- Milestone: Batch 4 — project-to-book-draft bridge and publish-mode convergence
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of writing-studio publish-mode entry points now bootstrap a linked
    draft through `/api/books/drafts`
  - `100%` of active `PolishedWriteView` publish transitions save the latest
    persisted project state before draft bootstrap
  - `100%` pass rate on focused Batch 4 route and hook tests plus repo
    type-check
- Completed deliverables:
  - project-linked draft bootstrap and reuse logic:
    `lib/books/insforge-book-service.ts`
  - route contract update:
    `app/api/books/drafts/route.ts`
  - publishing hook bootstrap update:
    `hooks/usePublishingBook.js`
  - real publish workflow handoff:
    `components/writing-studio/PublishingPage.tsx`
    `components/writing-studio/PolishedWriteView.tsx`
    `components/tools/writing-studio/workspace/publish/PublishWizard.jsx`
  - focused regression coverage:
    `app/api/books/drafts/route.test.ts`
    `hooks/usePublishingBook.test.jsx`
- Key technical decisions:
  - reused `source_project_id` as the canonical project-to-book linkage instead
    of extending the legacy `legacy_project_id` bridge
  - reused the existing persisted `PublishWizard` rather than evolving the mock
    `PublishingPage`, reducing mixed backend ownership on the active publish path
  - saved the current project before entering publish mode on the active
    `PolishedWriteView` shell so the draft bootstrap consumes current project
    metadata instead of stale authoring state
- Issues encountered and resolutions:
  - patch-context drift in the legacy mock `PublishingPage` made surgical edits
    noisy; resolved by replacing the file with a thin wrapper over the real
    publish wizard
  - editor diagnostics briefly reported a stale module-resolution error after the
    file replacement; resolved by validating the repo through a clean
    `pnpm exec tsc --noEmit --pretty false` pass
- Check-ins completed:
  - implementation checkpoint passed after project-linked draft bootstrap,
    publish-shell convergence, and pre-handoff project persistence were wired
  - validation checkpoint passed after focused route and hook coverage plus
    repo-level type-check
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the Batch 4 execution report
- Validation executed:
  - `pnpm exec vitest run app/api/books/drafts/route.test.ts hooks/usePublishingBook.test.jsx`
  - `pnpm exec tsc --noEmit --pretty false`
- Outcome:
  - writing projects now transition into a reusable persisted draft without
    manual title/category/language/bootstrap re-entry
  - the active writing-studio publish path now uses the real persisted publish
    workflow instead of a mock screen
  - Batch 4 writing workflow consolidation is closed and ready to hand off to
    Batch 5 publishing workflow completion
- Remaining blockers:
  - GitHub live tracker sync remains externally blocked on write-capable token
    permissions

### 2026-07-21: Batch 3 Phase 6 community preview moved onto the governed MCP runtime

- Milestone: Batch 3 Phase 6 — governed `community:preview` execution
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of `community:preview` direct and approval-triggered execution routed
    through governed MCP
  - `0` public MCP exposure for the internal community-preview governance tool
  - `100%` pass rate on targeted tests, `pnpm type-check`, and MCP runtime
    regression coverage
- Completed deliverables:
  - internal MCP tool registry entry for `shothik.twin.post_community_preview`
  - shared helper: `lib/twin/mcp-community-preview.ts`
  - internal execution route:
    `app/api/twin/book/community-preview/execute/route.ts`
  - direct route conversion:
    `app/api/twin/book/community-preview/route.ts`
  - approval-route conversion: `app/api/twin/approvals/route.ts`
  - focused regression tests for helper, internal executor, direct route,
    approval route, and native tool registry
- Key technical decisions:
  - wrapped the existing `twinPostCommunityPreview` mutation instead of
    duplicating the published-book and open-forum state rules in route logic
  - kept the tool internal-only because preview posting is a stateful,
    approval-managed publication action
- Check-ins completed:
  - implementation checkpoint passed after converging direct and approval
    community-preview execution on one governed runtime boundary
  - validation checkpoint passed after focused tests, type-check, and MCP
    runtime regression
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the phase report
- Validation executed:
  - `pnpm exec vitest run lib/twin/mcp-community-preview.test.ts lib/twin/mcp-book-publish.test.ts lib/twin/mcp-book-write.test.ts lib/twin/mcp-forum-post.test.ts lib/twin/mcp-forum-create.test.ts lib/twin/mcp-task-execution.test.ts lib/__tests__/native-tools.test.ts app/api/twin/book/community-preview/execute/__tests__/route.test.ts app/api/twin/book/community-preview/__tests__/route.test.ts app/api/twin/book/publish/execute/__tests__/route.test.ts app/api/twin/book/publish/__tests__/route.test.ts app/api/twin/book/write/execute/__tests__/route.test.ts app/api/twin/book/start/__tests__/route.test.ts app/api/twin/book/upload/__tests__/route.test.ts app/api/twin/book/metadata/__tests__/route.test.ts app/api/twin/forum/post/execute/__tests__/route.test.ts 'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' app/api/twin/forum/__tests__/route.test.ts app/api/twin/approvals/__tests__/route.test.ts`
  - `pnpm type-check`
  - `pnpm mcp:creative-studio:test`
- Outcome:
  - `community:preview` now shares one governed execution model across direct
    twin-key execution and approval-triggered execution
  - all planned Batch 3 approval-managed twin actions are now governed through
    the MCP runtime
- Remaining blockers:
  - Batch 3 runtime-governance backlog is closed
  - GitHub live tracker sync remains externally blocked on write-capable token
    permissions

### 2026-07-21: Batch 3 Phase 5 book publish moved onto the governed MCP runtime

- Milestone: Batch 3 Phase 5 — governed `book:publish` execution
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of `book:publish` direct and approval-triggered execution routed
    through governed MCP
  - `0` public MCP exposure for the internal book-publish governance tool
  - `100%` pass rate on targeted tests, `pnpm type-check`, and MCP runtime
    regression coverage
- Completed deliverables:
  - internal MCP tool registry entry for `shothik.twin.publish_book`
  - shared helper: `lib/twin/mcp-book-publish.ts`
  - internal execution route: `app/api/twin/book/publish/execute/route.ts`
  - new direct route: `app/api/twin/book/publish/route.ts`
  - approval-route conversion: `app/api/twin/approvals/route.ts`
  - focused regression tests for helper, internal executor, direct route,
    approval route, and native tool registry
- Key technical decisions:
  - introduced the missing direct publish API surface instead of skipping
    straight to approval-only governance, because `book:publish` already exists
    as a permissioned twin action in the roadmap and approval resolver
  - kept the tool internal-only because publishing is a high-risk state
    transition and should not be exposed on the public MCP host surface
- Check-ins completed:
  - implementation checkpoint passed after adding the missing direct route and
    converging direct plus approval execution on one governed runtime boundary
  - validation checkpoint passed after focused tests, type-check, and MCP
    runtime regression
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the phase report
- Validation executed:
  - `pnpm exec vitest run lib/twin/mcp-book-publish.test.ts lib/twin/mcp-book-write.test.ts lib/twin/mcp-forum-post.test.ts lib/twin/mcp-forum-create.test.ts lib/twin/mcp-task-execution.test.ts lib/__tests__/native-tools.test.ts app/api/twin/book/publish/execute/__tests__/route.test.ts app/api/twin/book/publish/__tests__/route.test.ts app/api/twin/book/write/execute/__tests__/route.test.ts app/api/twin/book/start/__tests__/route.test.ts app/api/twin/book/upload/__tests__/route.test.ts app/api/twin/book/metadata/__tests__/route.test.ts app/api/twin/forum/post/execute/__tests__/route.test.ts 'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' app/api/twin/forum/__tests__/route.test.ts app/api/twin/approvals/__tests__/route.test.ts`
  - `pnpm type-check`
  - `pnpm mcp:creative-studio:test`
- Outcome:
  - `book:publish` now shares one governed execution model across direct
    twin-key execution and approval-triggered execution
  - the roadmap gap is closed by adding the missing direct publish route under
    `app/api/twin/book/publish/route.ts`
- Remaining blockers:
  - `community:preview` is the last remaining Batch 3 action that still
    requires the same governed-MCP migration pattern

### 2026-07-21: Batch 3 Phase 4 book write moved onto the governed MCP runtime

- Milestone: Batch 3 Phase 4 — governed `book:write` execution
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of `book:write` direct and approval-triggered execution routed
    through governed MCP across `start`, `upload`, and `metadata`
  - `0` public MCP exposure for the internal book-write governance tool
  - `100%` pass rate on targeted tests, `pnpm type-check`, and MCP runtime
    regression coverage
- Completed deliverables:
  - internal MCP tool registry entry for `shothik.twin.execute_book_write`
  - shared helper: `lib/twin/mcp-book-write.ts`
  - internal execution route: `app/api/twin/book/write/execute/route.ts`
  - direct route conversions:
    - `app/api/twin/book/start/route.ts`
    - `app/api/twin/book/upload/route.ts`
    - `app/api/twin/book/metadata/route.ts`
  - approval-route conversion: `app/api/twin/approvals/route.ts`
  - focused regression tests for helper, internal executor, direct routes,
    approval route, and native tool registry
- Key technical decisions:
  - kept `book:write` as one governed tool with an explicit operation mode so it
    matches the existing shared approval action instead of fragmenting the lane
  - preserved internal-only exposure because the operation spans multiple
    side-effectful draft transitions and should not be available on the public
    MCP host surface
- Check-ins completed:
  - implementation checkpoint passed after converging `start`, `upload`, and
    `metadata` on one governed runtime boundary
  - validation checkpoint passed after focused tests, type-check, and MCP
    runtime regression
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the phase report
- Validation executed:
  - `pnpm exec vitest run lib/twin/mcp-book-write.test.ts lib/twin/mcp-forum-post.test.ts lib/twin/mcp-forum-create.test.ts lib/twin/mcp-task-execution.test.ts lib/__tests__/native-tools.test.ts app/api/twin/book/write/execute/__tests__/route.test.ts app/api/twin/book/start/__tests__/route.test.ts app/api/twin/book/upload/__tests__/route.test.ts app/api/twin/book/metadata/__tests__/route.test.ts app/api/twin/forum/post/execute/__tests__/route.test.ts 'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' app/api/twin/forum/__tests__/route.test.ts app/api/twin/approvals/__tests__/route.test.ts`
  - `pnpm type-check`
  - `pnpm mcp:creative-studio:test`
- Outcome:
  - `book:write` now shares one governed execution model across direct twin-key
    execution and approval-triggered execution
  - `book:start`, `book:upload`, and `book:metadata` now route through one
    internal MCP executor with operation-specific validation
- Remaining blockers:
  - `book:publish` and `community:preview` still require the same governed-MCP
    migration pattern
  - unresolved edge case: approval payloads now carry full upload content for
    governed parity, which should be revisited if payload-size limits become an
    operational concern

### 2026-07-21: Batch 3 Phase 3 forum posting moved onto the governed MCP runtime

- Milestone: Batch 3 Phase 3 — governed `forum:post` execution
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of `forum:post` direct and approval-triggered execution routed
    through governed MCP
  - `0` public MCP exposure for the internal forum-post governance tool
  - `100%` pass rate on targeted tests, `pnpm type-check`, and MCP runtime
    regression coverage
- Completed deliverables:
  - internal MCP tool registry entry for `shothik.twin.create_forum_post`
  - shared helper: `lib/twin/mcp-forum-post.ts`
  - internal execution route: `app/api/twin/forum/post/execute/route.ts`
  - direct route conversion: `app/api/twin/forum/[forumId]/post/route.ts`
  - approval-route conversion: `app/api/twin/approvals/route.ts`
  - focused regression tests for helper, internal executor, direct route,
    approval route, and native tool registry
- Check-ins completed:
  - implementation checkpoint passed after direct/approval path convergence
  - validation checkpoint passed after focused tests, type-check, and MCP
    runtime regression
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the phase report
- Validation executed:
  - `pnpm exec vitest run lib/twin/mcp-forum-post.test.ts lib/twin/mcp-forum-create.test.ts lib/twin/mcp-task-execution.test.ts lib/__tests__/native-tools.test.ts app/api/twin/forum/post/execute/__tests__/route.test.ts 'app/api/twin/forum/[forumId]/post/__tests__/route.test.ts' app/api/twin/forum/__tests__/route.test.ts app/api/twin/approvals/__tests__/route.test.ts`
  - `pnpm type-check`
  - `pnpm mcp:creative-studio:test`
- Outcome:
  - `forum:post` now shares one governed execution model across twin-key direct
    execution and approval-triggered execution
  - public MCP host routes still do not expose the internal forum-post
    governance surface
- Remaining blockers:
  - `book:write`, `book:publish`, and `community:preview` still require the
    same governed-MCP migration pattern

### 2026-07-21: Batch 3 Phase 2 forum creation moved onto the governed MCP runtime

- Milestone: Batch 3 Phase 2 — governed `forum:create` execution
- Responsible team:
  - delivery owner: `Ahsan Habib (@ahsanhab919-ux)`
  - implementation owner: `TRAE/Codex pair-programming agent`
  - reviewer and approver: `Project reviewer / user`
- KPIs for this slice:
  - `100%` of `forum:create` direct and approval-triggered execution routed
    through governed MCP
  - `0` public MCP exposure for the internal forum-governance tool
  - `100%` pass rate on targeted tests, `pnpm type-check`, and MCP runtime
    regression coverage
- Completed deliverables:
  - internal MCP tool registry entry for `shothik.twin.create_forum`
  - shared helper: `lib/twin/mcp-forum-create.ts`
  - internal execution route: `app/api/twin/forum/execute/route.ts`
  - direct route conversion: `app/api/twin/forum/route.ts`
  - approval-route conversion: `app/api/twin/approvals/route.ts`
  - twin-key auth propagation in `lib/mcp/shothik-native-adapter.ts`
  - focused regression tests for helper, forum route, approval route, and native
    tool registry
- Check-ins completed:
  - implementation checkpoint passed after direct/approval path convergence
  - validation checkpoint passed after focused tests, type-check, and MCP
    runtime regression
  - delivery checkpoint completed by refreshing execution plan, progress log,
    milestones, and the phase report
- Validation executed:
  - `pnpm exec vitest run lib/twin/mcp-forum-create.test.ts lib/twin/mcp-task-execution.test.ts lib/__tests__/native-tools.test.ts app/api/twin/forum/__tests__/route.test.ts app/api/twin/approvals/__tests__/route.test.ts`
  - `pnpm type-check`
  - `pnpm mcp:creative-studio:test`
- Outcome:
  - `forum:create` now shares one governed execution model across twin-key direct
    execution and approval-triggered execution
  - public MCP host routes still do not expose the internal forum-governance
    surface
- Remaining blockers:
  - `forum:post`, `book:write`, `book:publish`, and `community:preview` still
    require the same governed-MCP migration pattern

### 2026-07-21: Local OAuth session bridge implemented for InsForge callback hydration

- Added a local server-side OAuth exchange route:
  - `app/api/auth/oauth/exchange/route.ts`
- Added focused route coverage for request validation, success mapping, and
  upstream failure handling:
  - `app/api/auth/oauth/exchange/route.test.ts`
- Updated `providers/AuthProvider.tsx` to exchange `insforge_code` through the
  local app-domain route instead of relying on browser-only exchange plus
  refresh fallback
- Updated `providers/AuthProvider.test.tsx` so auth hydration now verifies the
  local callback route contract
- Focused validation executed:
  - `pnpm exec vitest run app/api/auth/oauth/exchange/route.test.ts providers/AuthProvider.test.tsx app/api/auth/sign-in/route.test.ts app/auth/post-login/__tests__/page.test.tsx`
- Current Batch 1 status after this change:
  - localhost OAuth callback persistence is implemented at the app-route layer
  - remaining runtime blocker is the authoritative staging `DATABASE_URL` needed
    to re-certify `/api/projects` and authenticated smoke end to end

### 2026-07-21: Batch 0 control reset initiated

- Re-audited the full repo state across auth/runtime, native tools, agent
  systems, and the writing-to-publishing workflow
- Confirmed the previously closed July 18 delivery lanes remain closed, but the
  repo is not yet end-to-end ready because active work now concentrates in:
  - auth/runtime stabilization
  - native tool runtime completion
  - agent-system unification
  - writing-to-publishing continuity
- Sanitized the tracked InsForge linkage files so committed project metadata no
  longer retains API keys:
  - `.insforge/project.json`
  - `.insforge/project.parent.json`
- Updated the execution plan and milestone tracker to the new batch-oriented
  sequence starting with the stabilization and control gate
- Reclassified the main executable blocker set:
  - staging `DATABASE_URL` drift remains the primary backend blocker
  - localhost Google OAuth callback persistence remains the primary auth blocker
  - GitHub tracker sync remains an external support-lane blocker
- Updated the platform and environment control docs so tracked InsForge linkage
  files are explicitly treated as non-secret reference metadata

### 2026-07-19: Auth compliance assertions standardized with list-item plus regex helpers

- Refactored `e2e/auth-compliance.spec.ts` to replace brittle whole-notice text
  assertions with a reusable list-item plus regex approach
- Added the shared regex catalog in:
  - `lib/auth-compliance-patterns.ts`
- Added the shared Playwright assertion helpers in:
  - `e2e/support/auth-compliance-assertions.ts`
- Added unit coverage for regex behavior and edge cases in:
  - `lib/__tests__/auth-compliance-patterns.test.ts`
- Added the maintainability standard and workflow documentation in:
  - `docs/testing/auth-compliance-list-item-regex-standard.md`
- Added the maintainability audit report in:
  - `docs/reports/auth-compliance-maintainability-audit-2026-07-19.md`
- Added targeted lint enforcement for the auth compliance suite in:
  - `eslint.auth-compliance.config.mjs`
  - `package.json` via `pnpm lint:auth-compliance`
- Validation executed:
  - `pnpm exec vitest run lib/__tests__/auth-compliance-patterns.test.ts` -> passed
  - `pnpm exec playwright test e2e/auth-compliance.spec.ts --project=chrome-stable` -> passed
  - `pnpm lint:auth-compliance` -> passed

### 2026-07-19: Auth/login disclosure phase completed and aligned with privacy policy

- Implemented a shared auth disclosure component in:
  - `components/auth/AuthComplianceNotice.tsx`
- Integrated the disclosure notice into:
  - `app/auth/login/page.tsx`
  - `app/auth/register/page.tsx`
- Added explicit disclosure coverage for:
  - service provider identity and privacy contact path
  - account-data collection purpose
  - optional remembered-email browser storage
  - third-party sign-in processing notice
  - direct links to `Privacy Policy`, `Terms & Conditions`, and `Data Deletion Policy`
- Updated registration consent text to link directly to the relevant legal pages
- Rewrote the privacy policy in:
  - `app/(secondary-layout)/privacy/page.jsx`
  so the auth/login clauses accurately reflect the live product's account, storage,
  analytics, and rights model
- Added compliance validation assets:
  - browser suite: `e2e/auth-compliance.spec.ts`
  - alignment report: `docs/reports/auth-login-privacy-alignment-2026-07-19.md`
  - test report: `docs/reports/auth-login-compliance-test-report-2026-07-19.md`
- Validation executed:
  - focused auth UI and route regression tests via `vitest` -> passed
  - cross-browser auth compliance validation via Playwright on `chrome-stable`
    and `firefox-stable` -> passed

### 2026-07-19: Auth/login compliance baseline adopted and P0 server controls implemented

- Established the first scoped compliance baseline for the auth/login surface in
  `docs/delivery/auth-login-compliance-baseline-2026-07-19.md`
- Adopted the following standards and reference frameworks for this lane:
  - `OWASP ASVS 5.0.0`
  - `OWASP Top 10`
  - `NIST SP 800-63B`
  - `W3C WCAG 2.2 AA`
  - `W3C HTML Living Standard` and `WAI-ARIA`
  - `RFC 9110`
  - `ISO/IEC 27001:2022`
  - `ISO/IEC 27701:2019`
  - `IEEE 29148:2018`
  - `GDPR Articles 5, 12, 13, 25, 32`
- Implemented first-pass P0 remediation in:
  - `lib/auth-compliance.ts`
  - `app/api/auth/sign-in/route.ts`
  - `app/api/auth/sign-up/route.ts`
  - `app/api/auth/forgot-password/route.ts`
  - `app/api/auth/send-verify-email/route.ts`
  - `app/api/auth/verify-email/route.ts`
  - `app/api/auth/reset-password/route.ts`
- Delivered the following controls:
  - generic sign-in and sign-up failure messages to reduce enumeration leakage
  - generic success responses for forgot-password and resend-verification after
    valid email submission
  - sanitized verify-email and reset-password upstream failure messaging
  - normalized server-side email validation for auth endpoints that accept email
  - same-origin/internal redirect enforcement for sign-up verification targets
- Added regression coverage for the new controls in:
  - `app/api/auth/sign-in/route.test.ts`
  - `app/api/auth/sign-up/route.test.ts`
  - `app/api/auth/forgot-password/route.test.ts`
  - `app/api/auth/send-verify-email/route.test.ts`
  - `app/api/auth/verify-email/route.test.ts`
  - `app/api/auth/reset-password/route.test.ts`
- Current boundary:
  - UI-level privacy disclosures and legal-link alignment remain a follow-up
    phase because the active auth UI files contain broader in-progress changes
    outside this narrow compliance hardening slice

### 2026-07-19: Login-validation suite refactored into isolated Playwright tests

- Refactored the login browser-validation coverage in
  `e2e/login-validation.spec.ts` from a single multi-scenario mega-test into
  focused Playwright test cases so failures map directly to the broken behavior
- Implemented distinct tests for:
  - page load and critical element availability
  - empty-field submission blocking and browser validation feedback
  - invalid-credential error handling while remaining on the login page
  - remembered-email hydration from browser-local state in an isolated context
  - successful-login flow when smoke credentials are available
- Updated the suite structure to align with Playwright best practices:
  - one behavior per test for clearer failure diagnostics
  - browser/page fixture isolation for the page-based tests
  - explicit fresh browser context creation for remembered-email hydration
  - per-test robots metadata attachment and evidence screenshots instead of a
    single aggregated report
- Validation after the refactor:
  - `pnpm exec playwright test e2e/login-validation.spec.ts --project=chrome-stable` -> passed
- Remaining boundary:
  - the successful-login test remains credential-gated and skips unless
    `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD` are available

### 2026-07-19: Local login-validation browser workflow restored and reverified

- Continued the next logical post-review step by restoring the local
  Playwright validation path for the login workflow
- Root causes identified:
  - `components/(primary-layout)/(home-v3-page)/components/features/agents/InspirationGallery.tsx`
    referenced a missing generated image asset, which prevented the local app
    from booting under Playwright's managed `next dev` server
  - `app/auth/login/page.tsx` rendered login-flow variant copy using
    `getLoginFlowVariant()` during render, which allowed server/client variant
    drift and caused a hydration mismatch in the browser
  - `lib/auth-flow.ts` still had unguarded local-storage reads/writes for login
    flow state and variant persistence, leaving the login path vulnerable to the
    same storage-restriction class of failures already fixed for remembered
    email
  - `e2e/login-validation.spec.ts` used `getByLabel("Email")`, which became
    ambiguous after the UI shifted to the label text `Remember email on this
    device`
- Implemented the targeted repairs in:
  - `components/(primary-layout)/(home-v3-page)/components/features/agents/InspirationGallery.tsx`
  - `app/auth/login/page.tsx`
  - `lib/auth-flow.ts`
  - `lib/__tests__/auth-flow.test.ts`
  - `e2e/login-validation.spec.ts`
- Updated the runtime and test behavior to:
  - replace the missing local gallery image import with a valid generated image
    URL so the local app can boot
  - defer login-flow variant selection until after hydration so SSR markup stays
    deterministic
  - ignore auth-flow local-storage failures so login can continue without local
    routing hints
  - raise the multi-scenario Playwright test timeout to fit the combined
    reporting workflow
  - make Playwright email-field selectors target the textbox role instead of an
    ambiguous shared label string
- Added focused regression coverage to verify:
  - auth-flow storage failures no longer throw
  - variant fallback remains stable when local storage is unavailable
- Re-ran validation after the repair:
  - `pnpm exec vitest run lib/__tests__/auth-flow.test.ts app/auth/login/__tests__/page.test.tsx lib/auth-login-preferences.test.ts app/api/auth/sign-in/route.test.ts app/api/auth/forgot-password/route.test.ts app/api/auth/reset-password/route.test.ts app/api/auth/send-verify-email/route.test.ts app/api/auth/verify-email/route.test.ts app/auth/post-login/__tests__/page.test.tsx scripts/run-login-validation.test.ts` -> passed
  - `pnpm exec tsc --noEmit --pretty false` -> passed
  - `pnpm exec playwright test e2e/login-validation.spec.ts --project=chrome-stable` -> passed
- Remaining boundary:
  - the successful-login branch in the browser suite still depends on real
    smoke credentials when that scenario needs to be executed against a valid
    account

### 2026-07-19: Remembered-email storage failures no longer break successful login

- Completed the highest-priority follow-up from the formal review of the login
  remember-email patch
- Root cause identified:
  - `lib/auth-login-preferences.ts` guarded `localStorage` reads but not
    `setItem` or `removeItem`
  - `app/auth/login/page.tsx` performs remembered-email persistence after
    `login(...)` succeeds inside the same `try` block
  - result: browsers or privacy modes that reject storage writes could surface a
    false `Login failed` message after authentication had already succeeded
- Implemented the targeted repair in:
  - `lib/auth-login-preferences.ts`
  - `lib/auth-login-preferences.test.ts`
  - `app/auth/login/__tests__/page.test.tsx`
- Updated the helper behavior to:
  - swallow remembered-email storage write failures
  - swallow remembered-email storage removal failures
  - preserve the successful login redirect and success state even when device
    storage is unavailable
- Added focused regression coverage to verify:
  - helper save operations remain non-fatal when storage writes throw
  - helper clear operations remain non-fatal when storage removals throw
  - the login page still redirects to `/auth/post-login` when remembered-email
    persistence or clearing is blocked after successful authentication
- Re-ran focused validation after the repair:
  - `pnpm exec vitest run lib/auth-login-preferences.test.ts app/auth/login/__tests__/page.test.tsx app/api/auth/sign-in/route.test.ts app/api/auth/forgot-password/route.test.ts app/api/auth/reset-password/route.test.ts app/api/auth/send-verify-email/route.test.ts app/api/auth/verify-email/route.test.ts app/auth/post-login/__tests__/page.test.tsx scripts/run-login-validation.test.ts` -> passed
  - `pnpm exec tsc --noEmit --pretty false` -> passed

### 2026-07-18: Browser login validation extended for remembered-email behavior

- Completed the next unblocked browser-validation slice adjacent to the auth
  hardening work
- Verified dependency status before implementation:
  - auth route regression coverage is in place
  - post-login routing is repaired
  - remembered-email behavior is implemented in the login UI
  - external blocker remains limited to real authorized smoke credentials for
    successful-login production validation
- Extended `e2e/login-validation.spec.ts` to cover:
  - remembered email hydration from device-local state
  - remembered email opt-out clearing without requiring authentication
  - remembered email persistence as part of the successful-login scenario when
    smoke credentials are available
- Updated `docs/testing-login-validation.md` to reflect the expanded browser
  scenario set and clarify which remembered-email checks do or do not require
  smoke credentials

### 2026-07-18: Login Remember me control made truthful and test-covered

- Continued the auth-lane hardening work by repairing the misleading
  `Remember me` checkbox on the login page
- Root cause identified:
  - `app/auth/login/page.tsx` exposed a stateful `Remember me` control
  - the selected value never influenced the provider, route, or any local
    preference state
  - result: the control was a user-visible no-op
- Implemented the narrow, safe fix:
  - added `lib/auth-login-preferences.ts` to manage local remembered-login
    email state
  - updated `app/auth/login/page.tsx` to:
    - hydrate the remembered email on page load
    - persist the normalized email after successful sign-in when opted in
    - clear the remembered email when the opt-in is disabled
    - relabel the control to the truthful behavior:
      - `Remember email on this device`
  - normalized the submitted email before validation, sign-in, and remember-on-
    device persistence so the flow uses one consistent address value
- Added focused regression coverage in:
  - `lib/auth-login-preferences.test.ts`
  - `app/auth/login/__tests__/page.test.tsx`
- Re-ran focused validation after the repair:
  - `pnpm exec vitest run lib/auth-login-preferences.test.ts app/auth/login/__tests__/page.test.tsx app/api/auth/sign-in/route.test.ts` -> passed
  - `pnpm exec tsc --noEmit --pretty false` -> passed

### 2026-07-18: Fast auth route regression coverage added for recovery and verification flows

- Continued the immediate-value auth hardening lane by adding focused route-level
  tests for the remaining recovery and verification endpoints
- Added new regression suites for:
  - `app/api/auth/forgot-password/route.test.ts`
  - `app/api/auth/reset-password/route.test.ts`
  - `app/api/auth/send-verify-email/route.test.ts`
  - `app/api/auth/verify-email/route.test.ts`
- Covered the highest-value route behaviors:
  - request validation failures
  - trimmed input handling
  - upstream InsForge success mapping
  - upstream error propagation and status preservation
  - password-strength validation for reset flows
- Re-ran focused validation after adding coverage:
  - `pnpm exec vitest run app/api/auth/forgot-password/route.test.ts app/api/auth/reset-password/route.test.ts app/api/auth/send-verify-email/route.test.ts app/api/auth/verify-email/route.test.ts` -> passed
  - `pnpm exec tsc --noEmit --pretty false` -> passed
- Outcome:
  - the auth lane now has fast unit-grade protection for sign-in, sign-up,
    sign-out, forgot password, reset password, resend verification, and verify
    email route contracts without depending on credentialed browser flows

### 2026-07-18: Post-login routing now prefers authenticated InsForge project history

- Completed the next immediate-value auth-lane fix by repairing post-login
  recommendation routing for authenticated users
- Root cause identified:
  - `app/auth/post-login/page.tsx` inferred the recommended route from
    `getProjects()` in the legacy local-storage helper
  - authenticated project truth now lives behind `/api/projects`, so returning
    users could be redirected toward stale or incorrect local drafts after login
- Implemented the targeted repair in:
  - `app/auth/post-login/page.tsx`
  - `app/auth/post-login/__tests__/page.test.tsx`
- Updated the post-login page to:
  - load authenticated project history from `/api/projects`
  - wait for that authenticated project state before auto-routing
  - fall back to local project history only if the authenticated fetch fails
  - preserve existing explicit redirect and intent-override behavior
- Added focused regression coverage to verify:
  - remote authenticated project history wins over stale local project history
  - local history is still used as a safe fallback if `/api/projects` fails
- Re-ran focused validation after the repair:
  - `pnpm exec vitest run lib/__tests__/auth-flow.test.ts app/auth/post-login/__tests__/page.test.tsx` -> passed
  - `pnpm exec tsc --noEmit --pretty false` -> passed

### 2026-07-18: Production login-validation runner stabilized and verified

- Added a dedicated repo-native launcher for the production login-validation
  flow:
  - `scripts/run-login-validation.mjs`
- Refactored the launcher into testable exported helpers so argument parsing,
  base URL validation, smoke-credential validation, and Playwright command
  generation can be covered directly instead of only through manual CLI runs
- Extended the runner to support:
  - comma-separated browser project lists via `--browser`
  - the default supported browser matrix via `--all-browsers`
  - explicit project validation for:
    - `chrome-stable`
    - `chromium`
    - `firefox-stable`
    - `safari-webkit`
    - `edge-stable`
- Added focused unit coverage in:
  - `scripts/run-login-validation.test.ts`
- Added operator-facing documentation in:
  - `docs/testing-login-validation.md`
- Verified the runner contract with targeted validation:
  - `pnpm exec vitest run scripts/run-login-validation.test.ts` -> passed
  - `pnpm test:e2e:login-validation -- --browser chrome-stable` -> passed
- Verified the multi-browser wrapper path against live production:
  - `pnpm test:e2e:login-validation -- --browser chrome-stable,firefox-stable --reporter=line` -> passed
- Confirmed the documented `pnpm ... -- ...` invocation path now works
  correctly after stripping the CLI separator before forwarding Playwright args
- Root cause for the remaining operator friction was identified and repaired:
  - the runner only read `process.env`
  - the repo’s documented secret workflow stores smoke credentials in ignored
    local env files such as `.env.local` and `.env.testsprite.local`
  - result: valid locally stored credentials were invisible to the login runner
- Implemented the targeted resolution:
  - reused the existing `scripts/lib/testsprite-env.mjs` env-resolution path
  - added fallback loading for:
    - `PLAYWRIGHT_BASE_URL`
    - `PLAYWRIGHT_SMOKE_EMAIL`
    - `PLAYWRIGHT_SMOKE_PASSWORD`
  - preserved precedence so direct process env values still win over env files
- Added regression coverage for:
  - env-file credential loading
  - env-file base URL loading
  - process-env precedence over env-file fallbacks
  - test/runtime-safe root directory resolution
- Re-ran the focused validation suite after the repair:
  - `pnpm exec vitest run scripts/run-login-validation.test.ts` -> passed
- Current bounded blocker remains unchanged:
  - authenticated success-path coverage still requires authorized
    `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD`
- Current unauthenticated evidence artifacts:
  - `test-results/login-validation-login-val-18ce1-orkflow-evidence-and-report-chrome-stable/login-validation-report.json`
  - `test-results/login-validation-login-val-18ce1-orkflow-evidence-and-report-firefox-stable/login-validation-report.json`

### 2026-07-18: Projects planner metadata and InsForge parity repaired

- Completed the authenticated `projects` / `project_versions` workflow closeout for
  planner-created writing projects
- Root cause identified:
  - `BookAgentStart.tsx` still created projects through the local-only
    `projects-store` helper, so authenticated planner runs never entered the
    InsForge-backed route family
  - the InsForge `public.projects` schema and route/service contract did not
    persist planner metadata required by the writing UI:
    - `researchNotes`
    - `agentChapters`
  - project stats used a flat `50_000` target for every type, producing
    inaccurate progress and ETA for research and assignment projects
- Implemented the repair in:
  - `components/writing-studio/BookAgentStart.tsx`
  - `hooks/useProjectsStore.ts`
  - `hooks/useProjectPersistence.ts`
  - `lib/projects/insforge-project-service.ts`
  - `app/api/projects/route.ts`
  - `app/api/projects/[id]/route.ts`
  - `migrations/20260718234500_projects-planner-metadata.sql`
- Applied the new migration to the linked backend:
  - `20260718234500_projects-planner-metadata.sql`
- Verified live backend schema parity through InsForge CLI:
  - `public.projects.research_notes` -> `jsonb`
  - `public.projects.agent_chapters` -> `jsonb`
- Re-ran the focused validation set:
  - `pnpm exec vitest run 'app/api/projects/route.test.ts' 'app/api/projects/[id]/route.test.ts' 'app/api/projects/[id]/content/route.test.ts' 'app/api/projects/[id]/settings/route.test.ts' 'app/api/projects/[id]/stats/route.test.ts' 'app/api/projects/[id]/versions/route.test.ts' 'app/api/projects/[id]/versions/[versionId]/restore/route.test.ts'` -> passed
  - `pnpm exec tsc --noEmit` -> passed
- Cleaned the remaining non-blocking editor hints in
  `components/writing-studio/PolishedWriteView.tsx`

### 2026-07-18: MCP Step 10 closeout review completed

- Reviewed `docs/shothik-sunpeak-host-runtime-validation.md` against the active
  Creative Studio package manifest, workflow fixtures, host-readiness fixtures,
  and `/api/mcp/creative-studio` route contract
- Confirmed the approved host target scope remains limited to:
  - `chatgpt`
  - `claude`
- Confirmed the package scenario coverage still matches the approved first host
  runtime slice:
  - dry-run planning
  - confirmation-gated remote mutation
  - confirmed execution response contract
  - authenticated access enforcement
  - client-secret exposure prevention
- Confirmed the active MCP code surface remains inside the Creative Studio
  vertical slice with no newly discovered parallel implementation branch
- Re-ran the required Phase 1 validation commands:
  - `pnpm mcp:package:validate` -> passed
  - `pnpm mcp:creative-studio:test` -> passed
  - `pnpm exec tsc --noEmit` -> passed
- Advanced the MCP lane to the next sequential task:
  - host-runtime evidence collection

### 2026-07-18: MCP host-runtime evidence collection infrastructure added

- Added deterministic host-runtime evidence support in:
  - `lib/mcp/host-runtime-evidence.ts`
  - `scripts/validate-creative-studio-host-runtime-evidence.ts`
- Added checked-in host evidence artifacts for the declared package targets:
  - `mcp-packages/creative-studio/runtime-evidence/chatgpt.json`
  - `mcp-packages/creative-studio/runtime-evidence/claude.json`
- Added `pnpm mcp:host-runtime:validate` so host evidence can now fail with
  explicit publishing blockers instead of only narrative notes
- Verified current browser access state for the declared host targets:
  - `ChatGPT` reachable, redirected to login
  - `Claude` reachable, redirected to login
- Current Phase 2 blocker is now explicit and reproducible:
  - `pnpm mcp:host-runtime:validate` reports missing authenticated host sessions
    for both targets
- Re-ran validation after the evidence-path additions:
  - `pnpm mcp:package:validate` -> passed
  - `pnpm mcp:creative-studio:test` -> passed
  - `pnpm exec tsc --noEmit` -> passed

### 2026-07-18: MCP authenticated host evidence captured

- Replaced the placeholder runtime blockers with captured authenticated evidence
  for the declared package targets:
  - `mcp-packages/creative-studio/runtime-evidence/chatgpt.json`
  - `mcp-packages/creative-studio/runtime-evidence/claude.json`
- Confirmed authenticated browser shells for both declared hosts:
  - `ChatGPT` at `https://chatgpt.com/`
  - `Claude` at `https://claude.ai/new`
- Recorded a bounded host-readiness mismatch for `Claude`:
  - authenticated UI is available
  - background requests for skills, reflections, and telemetry endpoints
    intermittently fail or abort in the inspected browser session
- Preserved the Creative Studio workflow contract in the evidence payload:
  - dry-run planning -> `200`
  - confirmation gate -> `409`
  - confirmed execution -> `200`
- Re-ran the focused Phase 2 validation suite:
  - `pnpm mcp:host-runtime:validate` -> passed
  - `pnpm exec vitest run lib/__tests__/host-runtime-validation.test.ts "app/api/mcp/creative-studio/route.test.ts"` -> passed
  - `pnpm mcp:package:validate` -> passed
  - `pnpm mcp:creative-studio:test` -> passed
  - `pnpm exec tsc --noEmit` -> passed
- Phase 2 host-runtime evidence collection is now complete and the next MCP step
  is the bounded remediation review for the `Claude` runtime-noise finding

### 2026-07-18: MCP Phase 2 transition package published

- Published the formal transition closeout in:
  - `docs/delivery/mcp-phase2-transition-report-2026-07-18.md`
  - `docs/delivery/mcp-phase-transition-meeting-2026-07-18.md`
  - `docs/delivery/mcp-phase3-execution-control-2026-07-18.md`
- Reviewed the completed phase against acceptance criteria, validation evidence,
  and bounded issue severity before approving the transition recommendation
- Recorded the unresolved issue register with owners and follow-up paths:
  - `Claude` runtime-noise finding -> Medium
  - GitHub tracker sync permission gap -> Medium
  - TestSprite staging credential blocker -> Medium
  - broader host publication proof still deferred to the release-readiness gate
    -> Low
- Formalized the next-phase scope, milestone timeline, risk register, review
  cadence, and validation matrix so Phase 3 can begin immediately after
  transition approval

### 2026-07-18: MCP Phase 3 remediation completed

- Re-ran a focused authenticated browser review for `Claude` and confirmed the
  previously flagged runtime noise does not affect core interactions:
  - composer
  - model selector
  - files/connectors menu
  - Projects and Artifacts navigation
  - a basic prompt-send path
- Reclassified the prior `Claude` finding from a bounded readiness mismatch to
  a documentation-only telemetry observation
- Corrected the checked-in runtime evidence in:
  - `mcp-packages/creative-studio/runtime-evidence/claude.json`
- Updated the host-runtime validation narrative and published the next-phase test
  preparation baseline:
  - `docs/shothik-sunpeak-host-runtime-validation.md`
  - `docs/delivery/mcp-phase4-release-readiness-test-plan-2026-07-18.md`
- Published the Phase 3 close summary:
  - `docs/delivery/mcp-phase3-closeout-2026-07-18.md`

### 2026-07-18: MCP Phase 4 release-readiness gate completed

- Filled the remaining focused Phase 4 coverage gaps:
  - added a unit test for recommended host-readiness assertion drift staying
    inspectable without becoming a false blocker
  - added a unit test for structural errors when captured host evidence omits
    the runtime payload
  - added route coverage for authenticated dry-run planning
  - added Creative Studio client coverage for dry-run plan rendering and
    successful execution result rendering
- Re-ran the full focused release-readiness validation set:
  - `pnpm mcp:package:validate` -> passed (`20` tests)
  - `pnpm mcp:creative-studio:test` -> passed (`20` tests)
  - `pnpm mcp:host-runtime:validate` -> passed
  - `pnpm exec tsc --noEmit` -> passed
- Re-ran the manual host verification flow and confirmed:
  - `ChatGPT` shell and composer remain healthy
  - `Claude` Projects, Artifacts, files/connectors entry, and prompt-send path
    remain healthy
  - telemetry-style background activity did not regress into a feature-impacting
    failure
- Published the gate report:
  - `docs/delivery/mcp-phase4-release-readiness-report-2026-07-18.md`
- The current MCP platform enablement lane is now complete for the approved
  Creative Studio slice

### 2026-07-18: Coverage and release automation repair completed

- Repaired root Vitest discovery so workspace-local `.testsprite-home/` cache
  content and `testsprite_tests/` artifacts no longer pollute repo coverage or
  test execution
- Aligned `.github/workflows/ci.yml` and `.github/workflows/security.yml` to the
  repo-pinned `pnpm@11.10.0` toolchain to remove package-manager drift between
  local and CI validation
- Refreshed `scripts/lib/release-readiness-report.mjs` to the current
  `2026-07-18` baseline and updated
  `scripts/generate-readiness-docs.mjs` so dated reports are generated only
  under `docs/reports/`
- Re-ran the closeout validation set:
  - `pnpm exec vitest run test/release-readiness-report.test.ts test/vercel-env-audit.test.ts` -> passed
  - `pnpm report:readiness` -> passed
  - `pnpm type-check` -> passed
  - `pnpm test` -> passed
  - `pnpm test:coverage` -> passed
  - production-style `pnpm build` -> passed using linked real InsForge env from
    `.env.local` plus compatibility placeholders for `STRIPE_SECRET_KEY`,
    `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
    `CLERK_SECRET_KEY`, and `API_KEY_SALT`
- Published the repaired readiness outputs:
  - `docs/reports/release-readiness-milestones-2026-07-18.md`
  - `docs/reports/test-report-2026-07-18.md`
  - `docs/reports/functional-acceptance-2026-07-18.md`
- Published the delivery closeout package:
  - `docs/delivery/coverage-release-automation-closeout-2026-07-18.md`
- Final validated baseline for the repaired lane:
  - type-check -> `real 2.41s`
  - tests -> `150` files / `1040` tests in `real 11.34s`
  - coverage -> `64.19%` statements, `56.52%` branches, `64.53%` functions,
    `64.85%` lines in `real 13.17s`
  - browser smoke -> `12 passed`, `4 skipped` in `real 29.22s`
  - production-style build -> `real 33.41s`

### 2026-07-18: MCP phase-by-phase execution checklist published

- Added `docs/delivery/mcp-platform-implementation-checklist-2026-07-18.md`
  as the active execution-control checklist for the next unblocked roadmap item
- Converted the MCP roadmap state into a sequential implementation plan covering:
  - Step 10 closeout review
  - host-runtime evidence collection
  - host-readiness remediation
  - release-readiness gating
  - controlled host-facing execution
- Kept `Authenticated TestSprite smoke credentials and coverage` as a blocked
  support lane rather than allowing it to displace the active MCP sequence
- Kept the GitHub token-permission repair as a governance support lane so local
  delivery evidence remains the source of truth until live tracker sync is
  restored

### 2026-07-18: Delivery governance hardening completed

- Added `docs/delivery/launch-gate-governance-2026-07-18.md` as the formal
  source of truth for named approvers, evidence sources, issue-aligned
  dependency checklists, and the executed `AGT-01` release-window approval
- Updated `scripts/generate-delivery-matrix.mjs` so the exported tracker no
  longer emits acting launch-gate owners and now includes formal approver and
  checklist context in the ticket records
- Regenerated the delivery summary artifacts so the next tracker refresh shows
  named gate-owner coverage instead of a governance-placeholder caveat
- Closed the governance phase in the roadmap artifacts after confirming:
  - named gate owners exist for all tracked workstreams
  - launch-gate evidence sources are attached per workstream
  - unresolved dependencies are captured as checklist items
  - the production rollout workstream now records release-window approval

### 2026-07-18: Production auth/chat rollout completed

- Repaired the production deployment pipeline by pinning `pnpm@11.10.0`,
  approving required `pnpm-workspace.yaml` build scripts, and excluding large
  workstation caches through `.vercelignore`
- Restored the public production site and then closed the authenticated chat
  path by shipping follow-up chat runtime fixes for:
  - dual-schema chat ownership support (`auth_user_id` and legacy `user_id`)
  - Gemini key fallback to `GEMINI_API_KEY`
  - supported Gemini model normalization to `gemini-flash-latest`
  - frontend message retrieval capped to the enforced `limit=100`
- Removed the synthetic deleted `migration-test-user` conversation/message pair
  from production and re-ran the ownership verification queries to a clean
  result:
  - conversations total `2`, missing `auth_user_id` `0`
  - messages total `0`, missing `auth_user_id` `0`
  - mismatched owner rows `0`
- Verified live production with both automated and browser-backed smoke:
  - public and authenticated Playwright smoke: `16 passed`
  - disposable verified production account reached post-login routes
  - `/agents/chat` create/list/read/generate succeeded on deployment
    `dpl_bYpiR6X3QCkMC1NdkL1BV48h28Lr`

### 2026-07-17: MCP gateway contract

- Completed the shared MCP gateway contract document and TypeScript scaffold
- Defined connector registry, policy, invocation, discovery, and audit event types
- Synchronized delivery-plan artifacts to move from architecture into implementation

### 2026-07-17: Managed connector scaffold

- Added the server-side MCP gateway, deterministic policy evaluator, and managed remote connector adapter
- Added the first Higgsfield managed connector definition scaffold
- Added focused tests for discovery, blocked mutation, and confirmed invocation

### 2026-07-17: Creative Studio server workflow

- Added the authenticated `/api/mcp/creative-studio` route
- Added env-backed Higgsfield runtime resolution and Creative Studio workflow orchestration
- Added focused service and route tests for auth, planning, and confirmation gating

### 2026-07-17: Creative Studio user-visible entry

- Added the first primary-layout Creative Studio page and client workflow surface
- Added dry-run planning, live execution, confirmation-required UX, and result display
- Added a focused UI interaction test for confirmation gating

### 2026-07-17: Validation-scope hardening

- Scoped root TypeScript and Vitest discovery away from the unrelated `brainstom ` vendor workspace
- Fixed the Creative Studio workflow guard so injected gateways do not require env-backed runtime configuration during tests
- Re-ran focused MCP and Creative Studio validation after the scope fix

### 2026-07-17: Native tool MCP mapping

- Reviewed prior MCP deliverables and unresolved follow-up items before starting the provider-side mapping step
- Added a tenant-scoped Shothik native connector definition and a versioned registry of selected native MCP-compatible tool descriptors
- Captured success criteria, requirements, milestone checkpoints, and follow-up boundaries in `docs/shothik-native-mcp-tool-mapping.md`
- Added focused registry tests and reran MCP workflow validation to confirm this step does not regress the Creative Studio slice

### 2026-07-17: Session-auth completion for projects and publish/export surfaces

- Removed the remaining legacy JWT handling from the proxy and Twin human-auth path, preserving only the active Twin API-key flow for agent callers
- Added the first InsForge-backed `projects` and `project_versions` schema, service layer, and `/api/projects` route family, then applied the migration to the linked `staging-chat-auth` backend
- Switched the authenticated `useProjectsStore` branch to the new first-party `/api/projects` endpoints instead of the legacy Convex project store
- Cleared the next auth dependency by migrating the remaining publish/export `auth_token` callers and their backing routes to InsForge session-backed auth with same-origin credentials
- Revalidated this sequence with TypeScript, focused Vitest regression runs, and protected-route probes that correctly returned OWASP `API2` authentication denials for anonymous publish/export access

### 2026-07-17: Phase 2 validation coverage

- Added focused Phase 2 tests for `lib/projects/insforge-project-service.ts`, `app/api/projects/route.ts`, `app/api/projects/[id]/versions/route.ts`, and `app/api/projects/[id]/versions/[versionId]/restore/route.ts`
- Verified owner-guard behavior, project create normalization, version save/list handling, and version restore snapshot behavior in the new InsForge-backed project slice
- Fixed the directly related pagination bug in the versions route so invalid negative `limit` values are clamped to the supported minimum before reaching the service layer
- Re-ran `pnpm vitest run lib/projects/insforge-project-service.test.ts app/api/projects/route.test.ts 'app/api/projects/[id]/versions/route.test.ts' 'app/api/projects/[id]/versions/[versionId]/restore/route.test.ts'`
- Re-ran repo-level `pnpm exec tsc --noEmit` after the test and route update batch

### 2026-07-17: Sunpeak packaging scaffold boundary

- Added a deterministic Creative Studio packaging scaffold builder in `lib/mcp/package-scaffold.ts`
- Added versioned package artifacts in `mcp-packages/creative-studio/` with a package manifest, smoke fixture, and package README
- Added `pnpm mcp:package:validate` plus focused scaffold tests to verify checked-in package artifacts match the generated manifest and fixture shapes
- Re-ran MCP regression coverage and repo-level type-check to confirm the packaging scaffold does not regress the current workflow slice

### 2026-07-17: Package validation expansion

- Expanded the Creative Studio package fixture set with confirmed execution and host-readiness artifacts for `chatgpt` and `claude`
- Added semantic package validation in `lib/mcp/package-validation.ts` to enforce workflow coverage, host-target readiness coverage, and manifest-to-fixture integrity
- Expanded `pnpm mcp:package:validate` to cover both package parity and package-rule validation
- Re-ran package validation, focused MCP regression coverage, and repo-level type-check after correcting one fixture contract mismatch

### 2026-07-17: Books Phase 1 migration completion

- Applied `migrations/20260717061456_books-phase1-core.sql` to the linked staging InsForge project
- Created the `book-manuscripts` private bucket and the `book-covers` public bucket
- Completed the InsForge-backed creator draft, marketplace, book detail, library, sales, credit-balance, and admin moderation cutover for Phase 1 launch surfaces
- Added admin moderation queue/stats API routes and focused regression tests, then re-ran targeted Vitest coverage plus repo-level `tsc --noEmit`

### 2026-07-17: Books staging smoke and Phase 2 kickoff

- Verified public staging smoke reachability on `https://staging.shothikgpt.com`; authenticated role smoke remains blocked by missing compliant staging credentials
- Added a repeatable representative data bootstrap fixture and seeding command: `pnpm seed:books:staging`
- Captured the current staging blocker state in `docs/reports/books-phase1-staging-smoke-2026-07-17.md`
- Launched Phase 2 planning for `Projects and writing persistence` in `docs/shothik-phase2-projects-writing-plan.md`

### 2026-07-17: Writing-studio browser gate accepted

- Completed the required create, save, reopen, version restore, and delete validation across Chrome Stable, Firefox Stable, Safari-equivalent WebKit, and Edge Stable
- Installed Firefox and WebKit under `.playwright-browsers` and added a workspace-local Microsoft Edge bundle under `.browser-apps`
- Updated `playwright.config.ts`, hardened writing-studio UI interactions, and recorded passing latency and data-consistency metrics in `docs/reports/writing-studio-cross-browser-consistency-2026-07-17.md`

### 2026-07-18: Residual writing-studio Convex audit

- Completed the post-browser-gate inventory of remaining project-specific Convex dependencies in editor, publishing, backend-bridge, and global-runtime surfaces
- Ranked the recommended removal order in `docs/reports/writing-studio-convex-audit-2026-07-18.md`
- Confirmed the next highest-value category is editor/project persistence leftovers, not publishing or bridge cleanup

### 2026-07-18: Active editor-path Convex removal slice

- Extended `hooks/useProjectPersistence.ts` so settings-only project saves are supported
- Added `hooks/useProjectCharacters.ts` and moved character persistence to `project.settings.characters`
- Removed `useConvexAutosave` from `components/writing-studio/PolishedWriteView.tsx`, rewired `components/writing-studio/nobel/CharacterPanel.tsx`, and deleted `hooks/useConvexAutosave.ts`
- Revalidated the slice with `pnpm exec tsc --noEmit`, the Chrome writing-studio lifecycle Playwright run, and focused browser confirmation that character data survives reload

### 2026-07-18: Sequential prioritization and TS7 decision controls

- Added `docs/delivery/sequential-prioritization-framework.md` to formalize weighted task ranking, completion criteria, handoff rules, and periodic review checkpoints
- Recorded the first applied ranking decision: active editor-path Convex removal outranked legacy wrapper/container and publishing cleanup
- Added a repo-specific TypeScript 7 evaluation to capture benefits, ecosystem risks, and the current recommendation boundary before any upgrade attempt

### 2026-07-18: Legacy writing-studio shell Convex removal

- Removed direct Convex reads and writes from `components/writing-studio/IntegratedWritingStudio.tsx` and `components/writing-studio/containers/ProjectContainer.tsx`
- Replaced shell-level project load and version save logic with `useProjectPersistence`
- Moved the legacy section-draft migration path to `project.settings.legacySectionDrafts` and guarded it against empty-payload overwrites
- Revalidated the slice with `pnpm exec tsc --noEmit` and a passing Chrome writing-studio lifecycle Playwright run

### 2026-07-18: Publish-surface Convex removal

- Added the Phase 2 publishing schema in `migrations/20260718093000_books-phase2-publishing-core.sql` and applied it to the linked `staging-chat-auth` backend after one transient `504` retry
- Added `lib/books/insforge-publishing-service.ts` plus authenticated routes for publish notifications and tax profiles
- Migrated `/api/publish/submit`, `/api/publish/status`, and `/api/webhooks/publishdrive` to the new InsForge-backed publishing service
- Removed publish-side `convex/react` usage from `NotificationBell.jsx`, `DistributionManager.jsx`, `TaxInformationStep.jsx`, and the discovered residual `components/books/DistributionStatusPanel.tsx`
- Added focused route and component tests for the new publish-surface replacement and re-ran `pnpm exec tsc --noEmit`

### 2026-07-18: Publish earnings Convex removal

- Added `migrations/20260718113000_books-phase2-earnings-core.sql` for author sales records, payout accounts, and payout history, then applied it to the linked `staging-chat-auth` backend
- Added `lib/books/insforge-earnings-service.ts` plus authenticated routes for `/api/publish/earnings`, `/api/publish/payouts`, and `/api/publish/payout-accounts`
- Migrated `hooks/useEarnings.js`, `EarningsDashboard.jsx`, and `PayoutManager.jsx` off `convex/react` and onto same-origin session-backed fetch flows
- Migrated `app/api/stripe/connect/route.ts` and `app/api/stripe/payout/route.ts` off bearer-token parsing and Convex-backed payout persistence
- Revalidated the slice with focused route/component Vitest runs, repo-level `pnpm exec tsc --noEmit`, and a residual grep showing no targeted earnings file still imports legacy Convex client dependencies

### 2026-07-18: Current phase execution controls

- Added `docs/delivery/current-phase-execution-control-2026-07-18.md` to formalize the active Phase 4 outstanding-item list, priority model, dependency chain, dated milestones, risk register, and daily blocker-escalation mechanism
- Added `docs/delivery/current-phase-progress-report-2026-07-18.md` as the running phase report covering finalized deliverables, remaining work to close the phase, next-phase roadmap, and cross-functional resource requirements
- Updated `docs/delivery/current-milestones.md` and `docs/delivery/current-execution-plan.md` so the roadmap now points directly to the new phase-control source of truth

### 2026-07-18: Backend compatibility bridge Convex removal

- Added `migrations/20260718143000_phase4-twin-render-bridge.sql` for `public.twins`, `public.twin_notifications`, and `public.book_render_jobs`, then applied it to the linked `staging-chat-auth` backend
- Added `lib/twin/insforge-twin-service.ts` and `lib/publishing/insforge-render-service.ts` as the new bridge-persistence services
- Migrated `app/api/writing-studio/notify-master/route.ts` off `api.twin.getByKeyHash` and `api.agent_notifications.createNotification`
- Migrated `lib/writing-studio/buildStore.ts` and `app/api/latex/status/[buildId]/route.ts` off `api.latex.*` fallback usage
- Revalidated the slice with focused Vitest coverage, repo-level `pnpm exec tsc --noEmit`, migration apply, and residual grep proving the target bridge files no longer import direct project-specific Convex APIs

### 2026-07-18: Final global Convex runtime bridge removal

- Added `migrations/20260718152000_phase4-twin-activity-log.sql` and applied it to the linked `staging-chat-auth` backend so twin route activity logging no longer depends on the Convex token bridge
- Expanded `lib/twin/insforge-twin-service.ts` and migrated `lib/twin-api-auth.ts` plus `lib/twin-route-guard.ts` off the Convex auth helper path
- Migrated `app/api/books/export/convert/route.ts` and `app/api/books/export/validate/route.ts` to InsForge-backed twin owner resolution and book access
- Replaced locale Convex hooks with local preference persistence in `i18n/useLoadConvexLocale.ts` and `i18n/useSyncLocaleToConvex.ts`
- Retired `app/api/auth/convex-token/route.ts`, `app/api/.well-known/jwks.json/route.ts`, `lib/convex-auth.ts`, and `providers/ConvexClientProvider.jsx`, then revalidated the slice with focused Vitest coverage, repo-level `pnpm exec tsc --noEmit`, migration apply, and residual grep

### 2026-07-18: Phase 4 final regression and closeout

- Removed stale active-lane locale gating from `components/partials/header/LanguageSwitcher/index.tsx`
- Ran the final combined focused validation batch across the completed publish, earnings, backend bridge, and global bridge slices
  - result: `21` test files passed, `46` tests passed
- Re-ran `pnpm exec tsc --noEmit`
  - result: passed
- Re-ran `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright test e2e/writing-studio-lifecycle.spec.ts --project=chrome-stable`
  - result: passed
- Published `docs/delivery/phase-4-closeout-and-handoff-2026-07-18.md`
- Updated the phase progress report, execution control, milestones, and roadmap docs to mark Phase 4 closed and transition the next work back to the broader rollout roadmap

## Active Risks

- External blocker: authenticated TestSprite smoke coverage still depends on staging-safe credentials not yet provisioned
- Cleanup follow-up: the disposable production smoke account used for release validation should be removed if long-lived test accounts are not desired
- Residual noise: authenticated chat browsing still surfaced non-blocking Convex console errors outside the now-working production chat API path
- Workspace noise: `brainstom ` vendor repositories are now excluded from root validation, but future config changes should preserve that isolation
- Legacy remainder: the active writing-studio Convex bridge removal is complete; remaining Convex usage is now outside the closed Phase 4 lane and should be handled by separate roadmap slices
- Tooling readiness: TypeScript 7 offers major speed gains, but the current repo still depends on a TypeScript 5.9.3-centered lint and toolchain stack that should not be upgraded blind

## Next Sequential Step

The next user-directed sequence returns to the broader roadmap:

1. Batch 6 end-to-end certification and release readiness
2. authenticated TestSprite staging coverage after credentials are provisioned
3. GitHub live tracker sync permission repair after token access is restored

### 2026-07-18: Active roadmap inventory reconfirmed

- Re-reviewed the current execution plan, progress log, milestone tracker, and
  active validation surfaces before starting any new code work
- Confirmed all repo-side implementation lanes already approved in the current
  roadmap are closed:
  - production auth/chat rollout
  - delivery governance hardening
  - Books Phase 1 migration
  - Projects and writing persistence
  - MCP platform enablement
  - coverage and release automation repair
- Confirmed there is no remaining unblocked in-repo feature module that can be
  implemented without violating the sequential delivery rule
- Confirmed the remaining executable roadmap items are external support lanes:
  - authenticated TestSprite staging coverage, blocked on
    `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD`
  - GitHub live tracker sync repair, blocked on write-capable token permissions
- Confirmed the current smoke suite already defers authenticated coverage until
  the missing staging credentials are supplied in:
  - `e2e/smoke.spec.ts`
- Established the fallback non-blocking cleanup candidate, if support-lane
  inputs remain unavailable:
  - residual Convex console-noise audit during authenticated browsing

### 2026-07-18: Chat stats function privilege hardening completed

- Investigated the InsForge advisor critical-security finding on
  `public.sync_chat_conversation_stats(uuid)` and verified the linked backend
  still exposed both chat stats functions to `PUBLIC`
- Confirmed `SECURITY INVOKER` is viable because `authenticated` already has the
  required table privileges and RLS still constrains updates to owner-scoped
  chat rows
- Hardened both the base chat-history migration and the live environment fix-up
  migration:
  - `migrations/20260713104922_chat-history-base.sql`
  - `migrations/20260718223640_harden-chat-stats-function-privileges.sql`
- Applied the new hardening migration to the linked `staging-chat-auth` backend:
  - `npx @insforge/cli db migrations up --to 20260718223640`
- Verified the effective remote function state via `pg_proc` and
  `pg_get_functiondef(...)`:
  - both `sync_chat_conversation_stats` and
    `sync_chat_conversation_stats_trigger` are now `SECURITY INVOKER`
  - only `project_admin` retains explicit execute privilege
- Re-ran `npx @insforge/cli diagnose advisor --json`
  - result: `issues: []`

### 2026-07-18: Chat RLS performance and FK index hardening completed

- Investigated a stale 10-item InsForge Advisor report against the live linked
  backend and verified:
  - the earlier `sync_chat_conversation_stats(uuid)` dangerous-function finding
    is already remediated in the linked environment
  - the live backend still lacked an index on `chat_messages.parent_message_id`
  - the live auth-owner chat RLS policies still used direct `auth.uid()` calls
    instead of the subquery-wrapped form recommended for large-table
    performance
- Updated the reproducibility path in the source migrations:
  - `migrations/20260713104922_chat-history-base.sql`
  - `migrations/20260714014616_adopt-native-chat-auth-ownership.sql`
- Added and applied a forward migration to the linked backend:
  - `migrations/20260718232000_chat-rls-perf-and-parent-index.sql`
  - `npx @insforge/cli db migrations up --to 20260718232000`
- Verified the live backend now includes:
  - `chat_messages_parent_message_idx` on `public.chat_messages(parent_message_id)`
  - all `chat_conversations_*_own` and `chat_messages_*_own` policies using
    `(select auth.uid())`
- Re-ran `npx @insforge/cli diagnose advisor --json`
  - result: `issues: []`

### 2026-07-18: InsForge Advisor dashboard discrepancy isolated

- Used browser automation to inspect the parent production project UI at
  `shothik-web` and confirmed the dashboard still shows:
  - `1 Critical Issue`
  - `10` total Backend Advisor issues
- Triggered a manual dashboard `Re-scan`
  - the visible issue counts remained unchanged in the UI
  - the scan timestamp updated to `Last scan just now`
- Verified the same parent production project through an explicit temporary
  parent-project link context:
  - `.tmp-parent-verify/.insforge/project.json` copied from
    `.insforge/project.parent.json`
  - `npx @insforge/cli current --json` confirmed project
    `74038e66-f220-4b64-8331-31c1968e54c4` / `shothik-web`
  - `npx @insforge/cli diagnose advisor --json` returned `issues: []`
- Verified the parent project database state directly:
  - `sync_chat_conversation_stats*` functions are `SECURITY INVOKER`
  - only `project_admin` retains execute privilege
  - `chat_messages_parent_message_idx` exists
  - live chat RLS policies use `(select auth.uid())`
- Current conclusion:
  - backend state is remediated on both staging and parent production projects
  - the remaining inconsistency is limited to the InsForge dashboard Advisor UI
    still surfacing a stale or mismatched scan result
