# Blocker Resolution Follow-Up Report

Date: 2026-07-20

Scope:
- official smoke credential provisioning and runtime verification
- staging `DATABASE_URL` certification
- Google social authentication migration to the active InsForge OAuth flow

## Executive Summary

Overall outcome: `partial`

- Smoke credentials were successfully provisioned, verified for password-based sign-in, and validated against the working authenticated surfaces.
- The current staging `DATABASE_URL` cannot be certified. Direct Postgres traffic is pointed at a database that does not contain the staging `projects` schema required by the active backend.
- Google social auth was migrated off the legacy `/auth/google-login` path and now starts the InsForge OAuth flow correctly, but localhost session persistence is still not completed after the OAuth callback.

## 1. Official Smoke Credentials

Status: `partially resolved`

Outcome:
- A dedicated staging-safe smoke account was provisioned through the first-party auth routes.
- The credential pair is stored locally in `.env.local` as:
  - `PLAYWRIGHT_SMOKE_EMAIL`
  - `PLAYWRIGHT_SMOKE_PASSWORD`
- The account is verified for:
  - email/password sign-in
  - authenticated chat entry
  - Convex token bridge access
  - baseline browser smoke coverage

Observed access scope:
- authenticated frontend session via `/api/auth/sign-in`
- access to `/agents/chat`
- successful `POST /api/auth/convex-token`
- access to general public and auth-routed smoke flows covered by the passing Playwright suites

Operational guidance:
- use this account only for staging smoke and authenticated regression verification
- do not reuse it for manual exploratory testing that mutates business data unless the run explicitly requires it
- rotate and reprovision if the password leaks or the account accumulates unintended state
- keep the raw password out of committed documentation and reference the `.env.local` values instead

Residual blocker:
- the focused authenticated smoke suite still fails on `GET /api/projects` because the app's active `DATABASE_URL` does not point at the staging database used by the linked InsForge backend

## 2. Staging DATABASE_URL Certification

Status: `failed certification`

Certification decision:
- `no-go` for the currently configured `DATABASE_URL`

Evidence:
- linked InsForge backend:
  - project: `staging-chat-auth`
  - app key: `ers8j28a-kj5`
  - public host: `https://ers8j28a-kj5.ap-southeast.insforge.app`
- current `.env.local` `DATABASE_URL` host lineage:
  - `ers8j28a.ap-southeast.database.insforge.app`
- direct Postgres probe against the current `DATABASE_URL` connected successfully but failed on:
  - `relation "public.projects" does not exist`
- linked backend inspection via InsForge CLI confirmed the staging backend does contain:
  - `public.projects`
  - `public.project_versions`
- a derived host swap to `ers8j28a-kj5.ap-southeast.database.insforge.app` with the existing password failed authentication, proving the staging credential cannot be safely inferred from the current URL

Connectivity and permissions findings:
- current URL is reachable over SSL
- current URL authenticates as `postgres`
- current URL does not expose the schema required by the active staging application
- therefore route-level failures against `/api/projects` are expected under the current configuration

Performance and health findings:
- `npx @insforge/cli diagnose db --json` reported:
  - no active lock issues
  - no slow-query findings in the advisor output
  - cache hit ratio `99.3`
- these metrics apply to the linked staging backend, not to the misaligned direct `DATABASE_URL`

Security and compliance findings:
- the configured URL is not acceptable for staging deployment certification because it is not aligned to the linked staging backend
- direct Postgres validation cannot be signed off until the authoritative staging connection string is sourced from the matching backend environment
- host derivation alone is insufficient because the staging database password differs from the currently configured credential

Required remediation before certification:
- replace `.env.local` `DATABASE_URL` with the authoritative staging Postgres URL for the linked `staging-chat-auth` backend
- rerun direct connectivity, schema, and benchmark probes against that exact credential
- rerun the authenticated `/api/projects` smoke path after env replacement

## 3. Google Social Authentication Migration

Status: `partially resolved`

Completed migration work:
- removed the legacy frontend dependency on the old `/auth/google-login` flow
- kept Google auth inside the active InsForge OAuth model
- preserved intent capture before social auth start
- fixed browser-side InsForge public config access so the Google button renders reliably in the client bundle
- added explicit OAuth callback exchange handling during auth hydration

Verified runtime behavior:
- Google button now renders on the login page
- clicking Google starts the InsForge OAuth flow successfully
- the browser reaches the local callback route:
  - `/auth/post-login?insforge_code=...`
- OAuth code exchange is now observed against the InsForge backend:
  - `POST https://ers8j28a-kj5.ap-southeast.insforge.app/api/auth/oauth/exchange`

Remaining blocker:
- after callback and exchange, localhost does not retain an authenticated app session
- the browser falls back to `/auth/login`
- a protected localhost request from the final page returns:
  - `GET /api/projects` -> `403 Authentication required`

Interpretation:
- OAuth initiation is migrated and functioning
- callback exchange is happening
- local session persistence or cookie bridging for the app host is still incomplete
- the migration is therefore not yet fully certified end-to-end for uninterrupted user access

## Test Evidence

Passing:
- `pnpm exec vitest run lib/convex-auth.test.ts app/api/auth/convex-token/route.test.ts`
- `pnpm exec vitest run app/auth/login/__tests__/page.test.tsx app/auth/post-login/__tests__/page.test.tsx`
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/login-validation.spec.ts e2e/smoke.spec.ts --project=chrome-stable`

Failing:
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/authenticated-core-smoke.spec.ts --project=chrome-stable`
  - failure point: `GET /api/projects` returns `500`

Browser validation:
- Google OAuth initiation succeeds
- callback reaches `/auth/post-login?insforge_code=...`
- InsForge OAuth exchange request is observed
- final localhost session remains unauthenticated

## Remaining Open Items

1. Source the authoritative staging `DATABASE_URL` for `staging-chat-auth`
2. Re-run the authenticated `/api/projects` smoke path after updating the URL
3. Complete localhost session persistence for the InsForge OAuth callback flow
4. Re-certify Google OAuth with a stable post-login authenticated landing
5. Re-run the full authenticated smoke suite after both blockers are cleared
