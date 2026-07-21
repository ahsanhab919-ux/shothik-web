# Current Milestones

## Completed

1. Coverage and release automation repair
   - Priority: P0
   - Status: Completed
   - Dependency: None
2. Delivery tracker normalization and dedicated GitHub issue mapping
   - Priority: P1
   - Status: Completed
   - Dependency: GitHub write access
3. TestSprite staging cloud bootstrap and public target recovery
   - Priority: P1
   - Status: Completed
   - Dependency: Public staging domain and Vercel deployment-protection remediation
4. Books Phase 1 implementation decomposition
   - Priority: P1
   - Status: Completed
   - Dependency: Approved Phase 1 MVP specification
5. Production env parity and rollout gate clearance
   - Priority: P0
   - Status: Completed
   - Dependency: Vercel production env audit now passes
6. Production deploy-first auth/chat promotion
   - Priority: P0
   - Status: Completed
   - Dependency: Successful production env audit pass and deploy-first execution order
7. Formal launch-gate approver capture in delivery tracker
   - Priority: P1
   - Status: Completed
   - Dependency: Validated contributor roster and dedicated GitHub issue mapping
8. Phase 2 projects and writing persistence
   - Priority: P1
   - Status: Completed
   - Dependency: completed Books Phase 1 migration, active writing-studio Convex dependency map, and approved Phase 2 plan
9. Books Phase 1 InsForge migration
   - Priority: P1
   - Status: Completed
   - Dependency: linked staging InsForge project, approved MVP scope, and schema/RLS implementation plan
10. MCP platform enablement
   - Priority: P1
   - Status: Completed
   - Dependency: expanded inspector fixtures, host-runtime evidence, remediation review, and release-readiness gate completion for the Creative Studio slice
11. Batch 0 stabilization and control gate
   - Priority: P0
   - Status: Completed
   - Dependency: approved sequential execution plan and current-state audit
12. Batch 1 auth and runtime foundation
   - Priority: P0
   - Status: Completed
   - Dependency: staging `DATABASE_URL` remediation, OAuth session bridge, and authenticated validation evidence
13. Batch 2 native tool runtime enablement
   - Priority: P1
   - Status: Completed
   - Dependency: Batch 1 completion and governed MCP runtime validation
14. Batch 3 agent-system unification
   - Priority: P1
   - Status: Completed
   - Dependency: Batch 2 completion, governed MCP migration of all approval-managed twin actions, and refreshed Batch 3 closeout evidence
15. Batch 4 writing workflow consolidation
   - Priority: P1
   - Status: Completed
   - Dependency: Batches 1 through 3 completion, project-linked draft bootstrap, and publish-mode convergence onto the persisted wizard workflow
16. Batch 5 publishing workflow completion
   - Priority: P1
   - Status: Completed
   - Dependency: Batch 4 completion, publishing-path convergence, and refreshed Batch 5 evidence

## Pending

1. Batch 6 end-to-end certification and release readiness
   - Priority: P0
   - Status: Pending
   - Dependency: Batches 1 through 5 completion.
2. GitHub live tracker sync permission repair
   - Priority: P1
   - Status: Blocked
   - Dependency: Restore write-capable GitHub token permissions so issue-comment sync can resume from the current environment.

## Active Phase Checkpoints

Current control source:

- `docs/delivery/coverage-release-automation-closeout-2026-07-18.md`
- `docs/delivery/current-phase-execution-control-2026-07-18.md`
- `docs/delivery/current-phase-progress-report-2026-07-18.md`
- `docs/delivery/launch-gate-governance-2026-07-18.md`
- `docs/delivery/mcp-platform-implementation-checklist-2026-07-18.md`

### Coverage and release automation checkpoints

1. `2026-07-18` - validation discovery repaired
   - Status: Completed
   - Dependency: root `vitest` excludes expanded to cover workspace-local TestSprite cache paths
2. `2026-07-18` - workflow toolchain alignment completed
   - Status: Completed
   - Dependency: CI and security workflows updated to `pnpm@11.10.0`
3. `2026-07-18` - readiness baseline refreshed
   - Status: Completed
   - Dependency: current coverage, test, smoke, env-audit, and build evidence captured for the `2026-07-18` baseline
4. `2026-07-18` - generated readiness reporting isolated from delivery trackers
   - Status: Completed
   - Dependency: `scripts/generate-readiness-docs.mjs` writes dated reports only under `docs/reports/`
5. `2026-07-18` - closeout and approval package published
   - Status: Completed
   - Dependency: delivery trackers synchronized to the validated completion state

### Governance refresh checkpoints

1. `2026-07-18` - formal approver roster locked
   - Status: Completed
   - Dependency: contributor directory revalidated and tracker issue ownership confirmed
2. `2026-07-18` - workstream evidence mapping attached
   - Status: Completed
   - Dependency: current rollout docs, CI/security workflow links, and tracker issue links confirmed
3. `2026-07-18` - unresolved dependency checklists synchronized
   - Status: Completed
   - Dependency: dedicated issue registry and matrix generator available
4. `2026-07-18` - `AGT-01` release-window approval recorded
   - Status: Completed
   - Dependency: completed production rollout verification evidence

### MCP enablement checkpoints

1. `2026-07-18` - MCP execution checklist published
   - Status: Completed
   - Dependency: active MCP roadmap state revalidated against the current plan and progress log
2. `2026-07-18` - Step 10 closeout review
   - Status: Completed
   - Dependency: current package manifest, fixture set, and host-runtime validator review
3. `2026-07-19` - host-runtime evidence collection
   - Status: Completed
   - Dependency: authenticated host evidence captured, validated, and recorded with one bounded non-blocking `Claude` runtime-noise finding
4. `2026-07-19` - phase transition handoff package
   - Status: Completed
   - Dependency: Phase 2 deliverables reviewed against acceptance criteria, unresolved issues documented with owners, and Phase 3 controls published
5. `2026-07-20` - host-readiness remediation complete
   - Status: Completed
   - Dependency: `Claude` runtime-noise finding reclassified as documentation-only telemetry noise; no host-contract remediation remains open
6. `2026-07-21` - MCP release-readiness gate
   - Status: Completed
   - Dependency: prepared Phase 4 release-readiness test baseline executed and gate outcome published
   - Dependency: validated host evidence and refreshed delivery documentation

### Batch 3 agent-system unification checkpoints

1. `2026-07-21` - compliance gate completed
   - Status: Completed
   - Dependency: OWASP ASVS 5.0 and MCP security alignment report published
2. `2026-07-21` - `task:*` governed MCP unification
   - Status: Completed
   - Dependency: internal task-execution tool, helper, and approval/runtime convergence validated
3. `2026-07-21` - `forum:create` governed MCP unification
   - Status: Completed
   - Dependency: twin-key auth propagation through native adapter, internal forum-create tool, focused regression suite, and refreshed delivery dashboard
4. `2026-07-21` - `forum:post` governed MCP unification
   - Status: Completed
   - Dependency: internal forum-post tool, approval/runtime convergence, focused regression suite, and refreshed delivery dashboard
5. `2026-07-21` - `book:write` governed MCP unification
   - Status: Completed
   - Dependency: shared book-write tool with operation modes, three route migrations, approval/runtime convergence, focused regression suite, and refreshed delivery dashboard
6. `2026-07-21` - `book:publish` governed MCP unification
   - Status: Completed
   - Dependency: internal book-publish tool, missing direct route introduction, approval/runtime convergence, focused regression suite, and refreshed delivery dashboard
7. `2026-07-21` - `community:preview` governed MCP unification
   - Status: Completed
   - Dependency: internal community-preview tool, helper and execution route convergence, approval/runtime convergence, focused regression suite, and refreshed delivery dashboard
8. `2026-07-21` - Batch 3 closeout and Batch 4 transition review
   - Status: Completed
   - Dependency: all governed-action slices validated, delivery controls refreshed, and Batch 3 phase reports published

### Batch 4 writing workflow consolidation checkpoints

1. `2026-07-21` - project-linked draft bootstrap introduced
   - Status: Completed
   - Dependency: `/api/books/drafts` route updated to reuse or create linked
     drafts through `source_project_id`
2. `2026-07-21` - writing-studio publish-mode handoff converged on `PublishWizard`
   - Status: Completed
   - Dependency: `PublishingPage` converted into a thin wrapper over the real
     persisted publish workflow and `usePublishingBook` now forwards `projectId`
3. `2026-07-21` - Batch 4 closeout and Batch 5 transition review
   - Status: Completed
   - Dependency: focused route and hook validation passed, type-check passed, and
     Batch 4 execution report published

### Batch 5 publishing workflow completion checkpoints

1. `2026-07-21` - author review flow and distribution consent aligned
   - Status: Completed
   - Dependency: review-step distribution consent persisted with the book draft
2. `2026-07-21` - payout and ONIX publishing-path convergence completed
   - Status: Completed
   - Dependency: shared Stripe payout execution added and ONIX export migrated
     off Convex
3. `2026-07-21` - Batch 5 closeout and Batch 6 transition review
   - Status: Completed
   - Dependency: focused publish/moderation regression suite passed, type-check
     passed, and Batch 5 execution report published

### Batch 6 end-to-end certification and release readiness checkpoints

1. `2026-07-21` - Batch 6 control gate and readiness artifacts refreshed
   - Status: Completed
   - Dependency: execution plan aligned to Batch 6, readiness-report model
     refreshed, and new generated readiness artifacts published
2. `2026-07-21` - Batch 6 go/no-go decision artifact generated
   - Status: Completed
   - Dependency: release decision model implemented, generator command added,
     validation tests passed, and go/no-go report published
