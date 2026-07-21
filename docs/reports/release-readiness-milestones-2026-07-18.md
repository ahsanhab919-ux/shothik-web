# Release-Readiness Milestones - 2026-07-18

## Completed

1. Coverage and release automation repair
   - Priority: P0
   - Status: Completed
   - Dependency: Vitest discovery isolated from workspace-local TestSprite caches, readiness baseline refreshed, and workflows aligned to pnpm@11.10.0
2. Delivery tracker normalization and dedicated GitHub issue mapping
   - Priority: P1
   - Status: Completed
   - Dependency: GitHub write access
3. TestSprite staging cloud bootstrap and public target recovery
   - Priority: P1
   - Status: Completed
   - Dependency: Public staging domain and Vercel deployment-protection remediation
4. Production env parity and rollout gate clearance
   - Priority: P0
   - Status: Completed
   - Dependency: Vercel production env audit now passes
5. Production deploy-first auth/chat promotion
   - Priority: P0
   - Status: Completed
   - Dependency: Successful production env audit pass and deploy-first execution order
6. Formal launch-gate approver capture in delivery tracker
   - Priority: P1
   - Status: Completed
   - Dependency: Validated contributor roster and dedicated GitHub issue mapping
7. Books Phase 1 InsForge migration
   - Priority: P1
   - Status: Completed
   - Dependency: Linked staging InsForge project, approved MVP scope, and schema/RLS implementation plan
8. Phase 2 projects and writing persistence
   - Priority: P1
   - Status: Completed
   - Dependency: Completed Books Phase 1 migration, active writing-studio Convex dependency map, and approved Phase 2 plan
9. MCP platform enablement
   - Priority: P1
   - Status: Completed
   - Dependency: Expanded inspector fixtures, host-runtime evidence, remediation review, and release-readiness gate completion for the Creative Studio slice

## Pending

1. Authenticated TestSprite smoke credentials and coverage
   - Priority: P1
   - Status: Blocked
   - Dependency: Populate PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD for staging-safe test accounts.
2. GitHub live tracker sync permission repair
   - Priority: P1
   - Status: Blocked
   - Dependency: Restore write-capable GitHub token permissions so issue-comment sync can resume from the current environment.
