# Native InsForge Chat Auth Rollout

## Scope

This rollout covers the coordinated release of native InsForge-authenticated
chat runtime and the follow-up migration that makes `auth_user_id` the
canonical chat owner.

## Coordinated Order

1. Open and review the PR from `feat/insforge-chat-history-slice-clean`
2. Obtain required code-owner approval
3. Deploy the updated application code
4. Apply the new migration:
   - `20260714014616_adopt-native-chat-auth-ownership.sql`
5. Run post-migration verification queries

## Preflight Status

- Repo branch pushed: `feat/insforge-chat-history-slice-clean`
- Merged into personal `origin/main` via commit: `ee1fc7b`
- Latest migration committed: `20260714014616_adopt-native-chat-auth-ownership.sql`
- Validation already passed locally:
  - `eslint`
  - `tsc --noEmit`
  - `vitest` (31 passing tests)
  - `next build` with production placeholder envs

## Live Database Preflight

- Backup created successfully:
  - file: `20260714_020104.sql.gz`
- Current remote migration state:
  - `20260713104922_chat-history-base.sql`
  - `20260713184106_chat-history-userid-text.sql`
- Current data shape before migration:
  - `chat_conversations`: 1 row, 0 UUID-like `user_id` values, 1 deleted row
  - `chat_messages`: 1 row, 0 UUID-like `user_id` values
  - orphan or mismatched message ownership rows: `0`

## Why The Order Matters

The currently deployed code still expects the pre-cutover schema. Applying the
new migration first would rename live columns and change RLS ownership checks
before the updated app code is serving traffic.

## Deployment Checks

- Confirm deployment target and environment variables
- Verify native InsForge auth env values are present
- Confirm health checks after deployment
- Smoke-test:
  - sign in
  - sign up
  - open chat conversation list
  - fetch conversation detail
  - fetch message history
  - delete a message

## Local Production Smoke

- `GET /api/health`: `ok`
- `GET /api/health?deep=true`: `unhealthy` in local-only validation, caused by
  intentionally missing backend/microservice/JWT production dependencies rather
  than the chat auth slice itself

## Post-Migration Verification Queries

```sql
select count(*) as conversations_total,
       count(*) filter (where auth_user_id is null) as conversations_missing_auth_user
from public.chat_conversations;

select count(*) as messages_total,
       count(*) filter (where auth_user_id is null) as messages_missing_auth_user
from public.chat_messages;

select count(*) as mismatched_message_owner_rows
from public.chat_messages m
join public.chat_conversations c on c.id = m.conversation_id
where m.auth_user_id is distinct from c.auth_user_id;
```

## Known External Blockers

- GitHub PR creation cannot be completed from this machine until GitHub auth is
  available in `gh` or the browser session.
- Vercel CLI access is now working from this machine, so Preview deployments
  are no longer blocked.
- Production database migration remains intentionally held until the production
  app deployment is completed, following the deploy-first rollout rule.

## Staging Preview Status (2026-07-14)

- InsForge CLI re-linked to staging backend:
  - project: `staging-chat-auth`
  - API base: `https://ers8j28a-kj5.ap-southeast.insforge.app`
- Vercel Preview envs corrected:
  - `NEXT_PUBLIC_INSFORGE_URL`
  - `NEXT_PUBLIC_INSFORGE_ANON_KEY`
  - `DATABASE_URL`
- Additional Preview-only compatibility envs added so the legacy Convex and
  Stripe routes do not fail during Next.js build/runtime:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `STRIPE_SECRET_KEY`
  - `API_KEY_SALT`
- Preview deployment is now live:
  - `https://shothik-3ivefel8r-shothik.vercel.app`

## Staging Preview Verification (2026-07-14)

- `vercel inspect` status: `Ready`
- Browser verification on deployed preview:
  - `/agents/chat` loads successfully
  - `/api/health` returns `200 OK`
  - unauthenticated `/api/chat` returns `403`
  - unauthenticated `/api/chat/conversations` returns `403`
  - unauthenticated `/api/docs/swagger.json` returns `403`
- Current interpretation:
  - deployment and middleware are healthy
  - chat/auth gating is active on preview
  - full authenticated chat persistence still requires a real sign-in/sign-up
    session in the preview environment

## Current Remaining Step

- Prepare and execute the production rollout in the established order:
  - run `pnpm audit:vercel:production`
  - confirm production Vercel env vars
  - deploy production application code
  - apply production ownership migrations
  - run post-promotion browser and SQL verification

## Staging Security Hardening Status (2026-07-15)

- Additional schema hardening applied on staging:
  - `20260715011500_chat-auth-owner-fk-hardening.sql`
  - `20260715013000_chat-legacy-owner-nullable.sql`
- Preview authorization is now enforced with:
  - native InsForge session cookies
  - RS256/JWKS access-token verification
  - current-user session hydration through InsForge
  - allowlisted email checks
  - required scope checks (`preview:access`)
- OWASP API2 middleware now recognizes native InsForge cookies so authenticated
  Preview/API requests are not falsely rejected as anonymous.

## Staging Verification Results (2026-07-15)

- Preview deployment used for final verification:
  - `https://shothik-4y0ad3qm7-shothik.vercel.app`
- Live preview gate matrix:
  - no session -> `401`
  - signed-in but not allowlisted -> `403`
  - allowlisted but missing scope -> `403`
  - allowlisted with scope -> `200`
- Database ownership verification:
  - authenticated conversation rows now persist `auth_user_id`
  - cross-user conversation reads/updates/deletes return `404`
  - mismatched conversation/message owner rows remain `0`
- Browser E2E verification:
  - login succeeds with staging test user
  - post-login routing lands on a valid route
  - `/agents/chat` loads within ~2 seconds with core UI present

## `/dashboard` 404 RCA And Fix (2026-07-15)

- Root cause was a combination of:
  1. authenticated `/auth/*` requests being force-redirected by `proxy.ts` to
     `/dashboard`
  2. no concrete `app/dashboard/page.tsx` route existing at that time
- Reproduction evidence before the fix:
  - authenticated `GET /auth/post-login` returned `307`
  - response header: `Location: /dashboard`
- Fix implemented:
  - authenticated `/auth/post-login` is now allowed through so the post-login
    decision page can run
  - other authenticated `/auth/*` routes are redirected to
    `/auth/post-login`, preserving any `redirect` query
  - `app/dashboard/page.tsx` now exists as a compatibility redirect to
    `/auth/post-login`
- Regression coverage added:
  - `lib/security/auth-route-redirect.ts`
  - `lib/security/auth-route-redirect.test.ts`

## Validation Snapshot

- `pnpm test` -> `107` test files passed, `884` tests passed
- `pnpm exec vitest run lib/security/auth-route-redirect.test.ts lib/security/preview-access.test.ts lib/security/owasp-compliance.test.ts`
- `pnpm exec tsc --noEmit`
- `PLAYWRIGHT_BROWSER_CHANNEL=chrome pnpm exec playwright test e2e/smoke.spec.ts`
  -> local smoke passed (`3 passed`, `1 skipped`)
- `PLAYWRIGHT_BASE_URL=https://shothik-4y0ad3qm7-shothik.vercel.app pnpm exec playwright test e2e/smoke.spec.ts`
  -> protected-preview smoke passed in request-only mode (`2 passed`, `2 skipped`)
- `lib/__tests__/auth-flow.test.ts` now passes in the shared Vitest environment
  after storage mocking was added in `test/setup.ts`.

## Remaining Work Before Production Promotion

- Latest production env audit (`pnpm audit:vercel:production`) is currently
  failing with these blocking findings:
  - `DATABASE_URL` missing
  - `NEXT_PUBLIC_INSFORGE_URL` missing
  - `NEXT_PUBLIC_INSFORGE_ANON_KEY` missing
  - no LLM provider key configured in production
- Current compatibility warnings from the same audit:
  - `NEXT_PUBLIC_CONVEX_URL` missing
  - `STRIPE_SECRET_KEY` missing
  - `API_KEY_SALT` missing
- Run `pnpm audit:vercel:production` and clear all blocking findings.
- Update production Vercel env vars to match the finalized InsForge rollout.
- Deploy the already-validated app changes to production before running any
  production database migration.
- Apply the staged chat ownership migrations in production.
- Re-run the authenticated Preview/production smoke flow after promotion:
  - sign in
  - land on valid post-login route
  - create/fetch/delete a conversation
  - confirm SQL ownership checks remain clean

## Active Blocker Register (2026-07-15)

### Blocker 1: GitHub CLI authentication is unavailable on this machine

- Root cause:
  - `gh auth status` reports no authenticated GitHub host session.
- Impact scope:
  - PR creation, PR review automation, and any GitHub-side merge checks cannot
    be completed directly from this environment.
- Affected team roles:
  - release owner
  - reviewer / code owner
  - platform engineer maintaining branch protections
- Resolution path:
  - run `gh auth login` or complete browser-based GitHub sign-in on this
    machine before the production merge/release window.
- Target resolution:
  - before production promotion begins
- Current status:
  - open external-access blocker

### Blocker 2: Production rollout is intentionally paused pending deploy-first sequencing

- Root cause:
  - production schema changes must not ship before the matching application code
    is live.
- Impact scope:
  - production remains on the previous ownership model until the controlled
    rollout window starts.
- Affected team roles:
  - backend owner
  - release owner
  - QA / verification owner
- Resolution path:
  - update production env vars
  - deploy app code
  - apply production migrations
  - run post-promotion smoke and SQL ownership checks
- Target resolution:
  - next production rollout window
- Current status:
  - planned dependency, not a staging defect

### Resolved blocker: auth-flow validation gap in sandboxed test runs

- Root cause:
  - `window.localStorage` was unavailable in the current Vitest sandbox.
- Impact scope:
  - `lib/__tests__/auth-flow.test.ts` failed before executing actual routing
    logic, weakening the regression signal for post-login flow work.
- Affected team roles:
  - frontend/auth owner
  - QA / CI owner
- Resolution:
  - added deterministic in-memory storage mocking in `test/setup.ts`.
- Validation:
  - `lib/__tests__/auth-flow.test.ts` now passes together with the security and
    redirect regression tests.
- Current status:
  - resolved

### Resolved blocker: Playwright smoke automation no longer fails on protected previews

- Root cause:
  - browser-backed tests were still requesting the `page` fixture before
    `test.skip()` could short-circuit, and local bundled-browser installation
    attempts were obscured by a stale Playwright cache lock.
- Impact scope:
  - smoke automation could fail before exercising the intended request-level
    checks, leaving the next-phase browser verification lane unreliable.
- Affected team roles:
  - frontend/auth owner
  - QA / CI owner
  - release owner
- Resolution:
  - restructured `e2e/smoke.spec.ts` so browser tests are only defined when the
    environment can actually run them
  - allowed protected-preview request smoke to pass without a Vercel bypass
    token while explicitly deferring browser navigation checks
  - added `PLAYWRIGHT_BROWSER_CHANNEL` support in `playwright.config.ts` so the
    local workstation can use installed Chrome without waiting on bundled
    Chromium downloads
  - aligned the Swagger smoke expectation with the current protected endpoint
    contract (`200`, `401`, or `403`)
- Validation:
  - local smoke passes with `PLAYWRIGHT_BROWSER_CHANNEL=chrome`
  - protected-preview smoke passes against the current Vercel preview without
    forcing browser startup when bypass credentials are absent
- Current status:
  - resolved

## Pending Task Priority And Deadlines (2026-07-15)

### P0: Production rollout prerequisites

- Task:
  - confirm production Vercel env values for InsForge and database connectivity
- Deadline:
  - 2026-07-15 end of day or before opening the production window
- Quality gate:
  - values reviewed against production InsForge project metadata

### P0: Production application deployment

- Task:
  - deploy the validated auth/chat code to production
- Deadline:
  - immediately before production migration
- Quality gate:
  - deploy succeeds, health endpoint responds, login route reachable

### P0: Production migration and ownership verification

- Task:
  - apply ownership hardening migrations and run SQL verification queries
- Deadline:
  - same release window, after code deployment
- Quality gate:
  - zero mismatched ownership rows and successful authenticated smoke checks

### P1: Production smoke verification

- Task:
  - run authenticated login -> post-login -> `/agents/chat` browser smoke and
    API ownership checks after promotion
- Deadline:
  - immediately after production migration
- Quality gate:
  - no 404 redirect regressions, chat loads, CRUD stays owner-scoped

### P1: Remote authenticated browser smoke prerequisites

- Task:
  - supply `PLAYWRIGHT_VERCEL_PROTECTION_BYPASS`,
    `PLAYWRIGHT_SMOKE_EMAIL`, and `PLAYWRIGHT_SMOKE_PASSWORD` to execute the
    authenticated preview/production browser path end to end
- Deadline:
  - before release-candidate sign-off for the next phase
- Quality gate:
  - authenticated Playwright smoke reaches `/agents/chat` within the existing
    five-second target on the protected target deployment

### P2: GitHub automation restoration

- Task:
  - restore `gh` authentication on the release workstation
- Deadline:
  - before the next PR-driven release cycle
- Quality gate:
  - `gh auth status` returns authenticated host details

## Next Phase Alignment Map

### Adjusted next-phase requirement: promote the validated staging auth model to production

- Current workstream alignment:
  - staging code, DB ownership checks, preview gate checks, and browser
    verification are complete
- Resource alignment:
  - frontend/auth workstream: ready
  - backend/schema workstream: ready
  - platform/release workstream: waiting on production env confirmation and
    GitHub auth restoration

### Adjusted next-phase requirement: preserve continuity through deploy-first sequencing

- Current workstream alignment:
  - rollout plan already enforces application deploy before DB migration
- Gap assessment:
  - no code gap remains
  - release execution and production validation still need to be performed in
    order

### Adjusted next-phase requirement: maintain verified security posture during cutover

- Current workstream alignment:
  - preview access controls, ownership checks, and redirect regression coverage
    are all in place
- Carry-forward requirements:
  - re-run the exact post-login and chat smoke flow in production
  - keep SQL ownership verification as a release exit criterion

## Progress Summary (2026-07-15)

- Verified blocker resolution:
  - post-login `/dashboard` 404 regression is fixed and covered by tests
  - sandboxed auth-flow validation is restored
  - Playwright smoke automation is stable for both local browser execution and
    protected-preview request-only execution
- Completed task sign-off:
  - staging preview access hardening: complete
  - staging ownership/RLS verification: complete
  - redirect hardening and compatibility routing: complete
  - smoke automation restructuring for next-phase readiness: complete
- Remaining unresolved items:
  - `gh auth status` is still unauthenticated on this workstation
  - production env confirmation, deployment, migration, and production smoke
    execution remain queued for the release window
  - authenticated remote browser smoke still requires operator-supplied preview
    bypass and smoke credentials
- Readiness assessment:
  - current code and test coverage are aligned with the adjusted next phase
  - engineering blockers inside the repo are cleared
  - remaining dependencies are operational release inputs, not code defects

## Production Completion (2026-07-18)

- Final production deployment:
  - `https://shothik-9rw3ebjso-shothik.vercel.app`
  - aliased at `https://www.shothikgpt.com`
- Production deployment pipeline repairs that were required before promotion:
  - pinned `packageManager` to `pnpm@11.10.0`
  - replaced unresolved `pnpm-workspace.yaml` `allowBuilds` placeholders with
    explicit approvals
  - added `.vercelignore` to exclude `.next`, browser bundles, and other local
    workstation artifacts from deployment uploads
- Compatibility env decision:
  - retained `NEXT_PUBLIC_CONVEX_URL`, `STRIPE_SECRET_KEY`, and
    `API_KEY_SALT` because the current production runtime still references those
    legacy compatibility paths
- Production chat runtime repairs delivered after the first live smoke pass:
  - added dual-schema chat ownership support so the app works against both
    `auth_user_id` and legacy `user_id` ownership columns
  - switched chat Gemini auth to accept `GEMINI_API_KEY`
  - normalized deprecated model handles to supported aliases such as
    `gemini-flash-latest`
  - reduced chat message retrieval to the enforced `limit=100`
- Production data remediation:
  - removed the synthetic deleted `migration-test-user` conversation/message
    pair that had remained from the pre-cutover dataset
- Final production SQL verification:
  - `chat_conversations`: `2` total, `0` rows missing `auth_user_id`
  - `chat_messages`: `0` total, `0` rows missing `auth_user_id`
  - mismatched conversation/message owner rows: `0`
- Final production smoke evidence:
  - unauthenticated route checks stayed healthy:
    - `/api/health` -> `200`
    - protected unauthenticated routes kept rejecting correctly
  - authenticated browser validation succeeded with a disposable verified
    production account:
    - login succeeded
    - post-login routing landed on a valid destination
    - `/agents/chat` loaded successfully
    - conversation create/list/read succeeded
    - prompt execution succeeded and persisted a completed assistant message
  - automated production smoke passed:
    - `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers PLAYWRIGHT_BASE_URL=https://www.shothikgpt.com PLAYWRIGHT_SMOKE_EMAIL=... PLAYWRIGHT_SMOKE_PASSWORD=... pnpm exec playwright test e2e/smoke.spec.ts --reporter=line`
    - result: `16 passed`
- Closure status:
  - the native InsForge production auth/chat rollout is complete
  - the next roadmap phase can now advance to delivery governance hardening

## Follow-Up Cleanup (Non-Blocking)

- Remove the disposable production smoke account if permanent production test
  accounts are not desired.
- Audit the residual Convex-related console noise observed during broader
  authenticated browsing; it did not block the final production chat validation.
