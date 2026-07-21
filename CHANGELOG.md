# Changelog

## 2026-07-18

- repaired the coverage and release-automation lane after `pnpm test:coverage`
  regressed by excluding the workspace-local `.testsprite-home/` cache and
  `testsprite_tests/` artifacts from root Vitest discovery
- aligned `.github/workflows/ci.yml` and `.github/workflows/security.yml` with
  the repo-pinned `pnpm@11.10.0` toolchain to remove package-manager drift
- refreshed `scripts/lib/release-readiness-report.mjs` to publish the current
  `2026-07-18` release baseline, including the now-passing production Vercel env
  audit, current smoke results, and the completed MCP platform enablement slice
- updated `scripts/generate-readiness-docs.mjs` so readiness reporting no longer
  overwrites `docs/delivery/current-milestones.md` and instead writes a dedicated
  dated report under `docs/reports/`
- updated `test/release-readiness-report.test.ts` and reran the refreshed
  release-automation validation suite, including type-check, unit tests,
  coverage, smoke, production-style build, and readiness report generation

## 2026-07-17

- removed legacy JWT handling from `proxy.ts` and `lib/twin-api-auth.ts` by
  switching protected app and Twin user flows to InsForge session-backed auth,
  while preserving the active Twin API-key path for agent calls
- added shared session helpers in `lib/http/session-auth.ts`,
  `lib/insforge/request.ts`, and `lib/convex-auth.ts` so first-party axios
  clients now clear legacy token storage, retry once through
  `/api/auth/refresh`, and redirect cleanly on expired sessions
- updated `app/api/auth/convex-token/route.ts` to mint Convex access tokens from
  the active InsForge session instead of trusting legacy access-token payloads
- created and applied `migrations/20260717213000_projects-phase2-core.sql` to
  add the Phase 2 `public.projects` and `public.project_versions` tables,
  indexes, grants, triggers, and owner-only RLS policies on the linked
  `staging-chat-auth` InsForge project
- added `lib/projects/insforge-project-service.ts` plus `lib/projects/http.ts`
  and the first `/api/projects` route family so authenticated project CRUD,
  content saves, settings updates, stats, version history, and restore flows now
  have an InsForge-backed server implementation
- updated `hooks/useProjectsStore.ts` so its authenticated branch now loads and
  mutates projects through the new first-party `/api/projects` endpoints instead
  of the legacy Convex project store
- completed the next sequential auth-cleanup slice for publish and export flows
  by moving the remaining `auth_token` UI callers and their backing routes onto
  InsForge session-backed auth with same-origin credentials, while retaining the
  explicit Twin agent-key path where it is still valid
- added focused Phase 2 validation coverage for the new `projects` migration
  slice in `lib/projects/insforge-project-service.test.ts`,
  `app/api/projects/route.test.ts`,
  `app/api/projects/[id]/versions/route.test.ts`, and
  `app/api/projects/[id]/versions/[versionId]/restore/route.test.ts`
- fixed the related project versions pagination bug so invalid negative `limit`
  values are clamped before the route calls the service layer
- validated the batch with `pnpm exec tsc --noEmit`,
  `pnpm vitest run lib/server-auth.test.ts lib/security/owasp-compliance.test.ts`,
  `pnpm vitest run services/__tests__/auth.service.test.ts test/env.test.ts`,
  `pnpm vitest run lib/projects/insforge-project-service.test.ts app/api/projects/route.test.ts 'app/api/projects/[id]/versions/route.test.ts' 'app/api/projects/[id]/versions/[versionId]/restore/route.test.ts'`,
  targeted anonymous route probes that correctly returned OWASP `API2`
  authentication denials for protected publish/export endpoints, and a live
  disposable-email auth E2E pass for resend verification delivery and throttling
  against the local app

## 2026-07-16

- normalized the delivery tracker source in `scripts/generate-delivery-matrix.mjs`
  so all workstreams now use verified GitHub issue or pull request IDs instead
  of placeholder tracker rows
- assigned named owners to every delivery workstream and replaced placeholder
  owner/contact values with documented contributors from
  `docs/delivery/contributor-directory.md`
- updated `docs/delivery/README.md` to describe the GitHub-backed mapping model
  used by the tracker when dedicated workstream issues are not yet available
- added `scripts/create-delivery-issues.mjs` and
  `docs/delivery/dedicated-issue-seed.json` so dedicated delivery-tracker
  GitHub issues can be created and recorded automatically once write-capable
  GitHub authentication is available
- created dedicated GitHub delivery-tracker issues `#41` through `#54`,
  wrote `docs/delivery/issue-registry.json`, and regenerated the delivery
  matrix so exported tracker rows now point at dedicated issues instead of
  fallback repository mappings
- normalized all active delivery-tracker owner and assignee references to
  `Ahsan Habib (@ahsanhab919-ux)` and updated the dedicated GitHub issue sync
  path so future tracker refreshes keep GitHub issues aligned with that owner
- added `docs/delivery/current-execution-plan.md` and
  `docs/shothik-books-phase1-implementation-plan.md` to convert the approved
  next-step recommendation into execution-ready delivery and Books Phase 1
  workstream artifacts
- restored local coverage publishing by aligning `vitest` and
  `@vitest/coverage-v8` at `4.1.10`, and documented the resulting validation,
  benchmark timings, and rollout deviation notes in
  `docs/reports/implementation-review-2026-07-16.md`
- added `scripts/audit-vercel-env.mjs` and the `pnpm audit:vercel:production`
  command so production rollout prerequisites can be checked directly against
  Vercel before deploy-first promotion begins
- extracted the Vercel environment audit logic into
  `scripts/lib/vercel-env-audit.mjs`, added `test/vercel-env-audit.test.ts`,
  and updated environment documentation so the production rollout gate is now
  covered by automated tests instead of existing only as a CLI path
- added `scripts/lib/release-readiness-report.mjs` plus
  `scripts/generate-readiness-docs.mjs` so milestone rollups, test reporting,
  and functional acceptance documents are generated from the same validated
  release baseline used by the delivery tracker
- initialized TestSprite MCP workspace artifacts under `testsprite_tests/`,
  generated a project PRD, code summary, and frontend test plan, completed an
  initial browser-automation run for invalid-login validation, and recorded the
  result in `testsprite_tests/testsprite-mcp-test-report.md`
- added `scripts/run-testsprite-local.mjs`, `pnpm testsprite:mcp`, and
  `pnpm testsprite:run` so TestSprite MCP can run from this repo with a
  workspace-local `HOME` override and without storing API keys in tracked files
- hardened the TestSprite local runner with active-vs-stale lock detection and
  added `pnpm testsprite:status` plus `pnpm testsprite:unlock` for safer
  recovery from interrupted or stuck executions
- expanded `testsprite_tests/testsprite_frontend_test_plan.json` with public
  homepage, health endpoint, swagger JSON, paraphrase tool, and dashboard
  compatibility cases, then executed a five-case public TestSprite batch
  directly from the updated plan with all selected cases passing
- added `scripts/lib/testsprite-readiness-report.mjs`,
  `scripts/audit-testsprite.mjs`, and `test/testsprite-readiness-report.test.ts`
  so TestSprite readiness can be audited from the live workspace with explicit
  completed workstreams, pending tasks, priorities, dependencies, and owner
  mapping
- added `pnpm testsprite:audit` and `pnpm testsprite:report`, updated
  `docs/project-platform-setup.md`, and generated a dedicated readiness report
  path for the now-verified six-case public TestSprite smoke batch
- added `scripts/lib/testsprite-project-bootstrap.mjs`,
  `scripts/bootstrap-testsprite-project.mjs`, and
  `test/testsprite-project-bootstrap.test.ts` so the repo can bootstrap a
  managed TestSprite cloud project idempotently once a live preview or staging
  URL is available
- documented `TESTSPRITE_PROJECT_URL` helpers in `.env.example`, added
  `pnpm testsprite:project`, and hardened the bootstrap flow so it rejects
  loopback URLs and disabled preview deployments before attempting cloud
  project creation
- added `scripts/lib/testsprite-env.mjs` plus
  `test/testsprite-env.test.ts` to centralize secure TestSprite env loading
  across the local runner, audit flow, and project bootstrap
- added ignored `.env.testsprite*.local` support, documented Trae/MCP-managed
  `TESTSPRITE_API_KEY` handling, and changed the local runner so
  `testsprite_tests/tmp/config.json` is no longer the default secret source
- hardened `pnpm testsprite:project` so cloud bootstrap now rejects Vercel
  previews that redirect through interactive SSO or login protection, and
  documented the staged custom-domain requirement in
  `docs/project-platform-setup.md`
- resolved the active TestSprite cloud-bootstrap blocker by disabling Vercel
  `Deployment Protection -> Vercel Authentication -> Require Log In` for the
  `shothik-web` project, which had been forcing `staging.shothikgpt.com`
  through `vercel.com/sso-api` instead of the app
- completed the persistent TestSprite cloud project bootstrap against
  `https://staging.shothikgpt.com` and refreshed
  `docs/reports/testsprite-readiness-2026-07-16.md` so readiness now reflects
  `Cloud project configured: yes`
- normalized TestSprite project bootstrap metadata so CLI responses that return
  `projectId` instead of `id` are stored correctly in
  `testsprite_tests/tmp/project.json`
- populated Vercel Production with the core InsForge runtime variables
  `DATABASE_URL`, `NEXT_PUBLIC_INSFORGE_URL`, and
  `NEXT_PUBLIC_INSFORGE_ANON_KEY` using the linked production InsForge project
- fixed `pnpm audit:vercel:production` so encrypted Vercel vars that appear in
  `vercel env ls` but are redacted as empty strings by `vercel env pull` are
  now treated as configured instead of false-positive missing values
- added `OPENROUTER_API_KEY` support as an accepted AI provider for production
  env validation, credential audits, and Vercel env audits, and added OpenRouter
  as the final fallback provider in the LLM gateway
- added `docs/shothik-mcp-gateway-contract.md` and
  `lib/mcp/gateway-contract.ts` to define the first shared contract for
  multi-connector MCP registry, policy, invocation, and audit handling, and
  synchronized the active delivery plan artifacts to make the gateway contract
  the next single execution step before connector adapter work
- added `lib/mcp/gateway.ts`, `lib/mcp/managed-connector-adapter.ts`,
  `lib/mcp/policy.ts`, `lib/mcp/connectors/higgsfield.ts`, and
  `lib/__tests__/mcp-gateway.test.ts` to scaffold the first server-side MCP
  gateway, deterministic policy evaluation, and Higgsfield managed-connector
  path, then validated the scaffold with focused tests and a full type-check
- added `lib/mcp/runtime.ts`, `lib/mcp/creative-studio.ts`, and
  `app/api/mcp/creative-studio/route.ts` to wire the first authenticated
  Creative Studio workflow through the MCP gateway using the env-backed
  Higgsfield connector runtime, plus focused service and route tests for auth,
  confirmation gating, and planned invocation behavior
- added `app/(primary-layout)/creative-studio/page.tsx`,
  `app/(primary-layout)/creative-studio/CreativeStudioClient.tsx`, and
  `app/(primary-layout)/creative-studio/CreativeStudioClient.test.tsx` to
  expose the first user-visible Creative Studio workflow entry surface with
  dry-run planning, confirmation-required UX, and live MCP execution results,
  and added `docs/delivery/current-progress-log.md` to track remaining work,
  acceptance criteria, and active risks
- updated `tsconfig.json` and `vitest.config.ts` to scope root validation away
  from the unrelated `brainstom ` vendor workspace, and updated
  `lib/mcp/creative-studio.ts` so dependency-injected gateways can execute
  without requiring env-backed runtime resolution during focused tests
- added `docs/shothik-native-mcp-tool-mapping.md`,
  `lib/mcp/connectors/shothik-native.ts`, `lib/mcp/native-tools.ts`, and
  `lib/__tests__/native-tools.test.ts` to define the first selected
  Shothik-native MCP-compatible provider catalog, including stable tool names,
  route mappings, schema metadata, tenant-scoped native connector binding, and
  focused registry validation ahead of sunpeak packaging scaffold work
- added `docs/shothik-sunpeak-packaging-scaffold.md`,
  `lib/mcp/package-scaffold.ts`, `mcp-packages/creative-studio/manifest.json`,
  `mcp-packages/creative-studio/fixtures/creative-studio-smoke.json`,
  `mcp-packages/creative-studio/README.md`, and
  `lib/__tests__/package-scaffold.test.ts`, plus the `pnpm mcp:package:validate`
  script, to version the first Creative Studio package scaffold boundary for
  sunpeak with deterministic manifest parity and regression coverage
- added `docs/shothik-sunpeak-package-validation.md`,
  `lib/mcp/package-validation.ts`,
  `mcp-packages/creative-studio/fixtures/creative-studio-confirmed-run.json`,
  `mcp-packages/creative-studio/fixtures/creative-studio-chatgpt-readiness.json`,
  `mcp-packages/creative-studio/fixtures/creative-studio-claude-readiness.json`,
  and `lib/__tests__/package-validation.test.ts`, and expanded
  `pnpm mcp:package:validate` plus `lib/__tests__/package-scaffold.test.ts` to
  cover package-rule validation, host-target readiness coverage, and expanded
  workflow fixture integrity ahead of packaging-specific host-runtime testing
- added `docs/insforge-backend-migration-plan.md` to capture the complete
  Convex-to-InsForge backend migration inventory, field-level schema alignment,
  prioritized rebuild roadmap, and phased implementation plan for the first
  non-chat Books migration anchored on `convex/books.ts`
