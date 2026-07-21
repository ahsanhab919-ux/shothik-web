# Auth And Backend Validation Report

## Scope

This report records the July 20, 2026 validation and remediation work for:

- frontend end-to-end authentication flow validation
- InsForge host configuration consistency remediation
- backend link verification for the `auth` module

Selected business module:

- `auth`

## Executive Status

Overall disposition:

- `partially passed with targeted remediations applied`

Completed remediations:

- fixed resend-verification throttling at `app/api/auth/send-verify-email/route.ts`
- aligned browser E2E expectations with the security contract for resend throttling
- narrowed proxy auth-attempt rate limiting so `/api/auth/convex-token` is no longer bucketed as a brute-force auth attempt
- confirmed `.env.local` and `.insforge/project.json` now use the same public InsForge host

Remaining limits on final acceptance:

- official authenticated smoke credentials are still not configured locally, so the existing credential-gated "known official account" success path remains skipped
- the deep disposable-mail auth harnesses remain slower and less deterministic than the browser/UI checks because they depend on external mailbox delivery latency
- `DATABASE_URL` still points at `ers8j28a.ap-southeast.database.insforge.app`, which does not match the active staging branch host lineage and needs an authoritative staging Postgres credential source before any direct-Postgres module can be certified against staging
- Google social login still appears to use a legacy `/auth/google-login` path and was not remediated in this execution slice

## Configuration Audit

Canonical backend source:

- `.insforge/project.json`
- public host: `https://ers8j28a-kj5.ap-southeast.insforge.app`

Observed local environment state:

- `NEXT_PUBLIC_INSFORGE_URL = https://ers8j28a-kj5.ap-southeast.insforge.app`
- `DATABASE_URL` host = `ers8j28a.ap-southeast.database.insforge.app`

Audit result:

- `NEXT_PUBLIC_INSFORGE_URL`: `aligned`
- `.env.local` vs `.insforge/project.json` public host drift: `resolved`
- `DATABASE_URL` staging consistency: `not yet certified`

Documentation synchronized:

- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/project-platform-setup.md`

## Auth Module Mapping

Validated auth-module wiring:

- frontend login/register flows call first-party routes under `/api/auth/*`
- server-side identity resolution uses InsForge session cookies
- authenticated token bridge uses `/api/auth/convex-token`
- route protection is enforced by `proxy.ts`
- client runtime mounts the Convex bridge through `providers/ConvexClientProvider.jsx`

Validated key paths:

- `/api/auth/sign-in`
- `/api/auth/sign-up`
- `/api/auth/verify-email`
- `/api/auth/send-verify-email`
- `/api/auth/sign-out`
- `/api/auth/convex-token`

Important architecture note:

- `/api/auth/convex-token` is an authenticated post-login token bridge, not a credential-submission route. It must not share the brute-force limiter intended for sign-in and verification attempts.

## Remediations Applied

### 1. Resend verification throttling

Problem:

- immediate resend attempts were not blocked locally, causing the deeper auth-email validation to fail with `Immediate resend should be blocked.`

Fix:

- added a 60-second resend limiter in `app/api/auth/send-verify-email/route.ts`
- returns `429` with:
  - `error = AUTH_RESEND_VERIFICATION_RATE_LIMITED`
  - `message = Please wait before requesting another verification code.`
  - `Retry-After` header

Verification evidence:

- route unit test passed
- live sequential probe returned:
  - first resend request: `200`
  - immediate second resend request: `429`

### 2. Auth proxy rate-limit classification

Problem:

- `proxy.ts` applied the "Too many authentication attempts" limiter to every `/api/auth/*` route, including `/api/auth/convex-token`

Impact:

- authenticated post-login token minting could be throttled like a brute-force login attempt

Fix:

- narrowed the auth-attempt limiter to true credential and verification endpoints only:
  - `/api/auth/sign-in`
  - `/api/auth/sign-up`
  - `/api/auth/forgot-password`
  - `/api/auth/reset-password`
  - `/api/auth/send-verify-email`
  - `/api/auth/verify-email`

Verification evidence:

- unauthenticated probe to `/api/auth/convex-token` now cleanly returns `401 Authentication required` instead of being pre-empted by the auth-attempt limiter

## Executed Validation

### Automated tests

1. `pnpm exec vitest run app/api/auth/send-verify-email/route.test.ts`
   - result: `passed`
   - notes: `5 tests passed`

2. `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/auth-email-flows.spec.ts --project=chrome-stable`
   - result: `passed`
   - notes: `2 tests passed`

3. `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/login-validation.spec.ts --project=chrome-stable`
   - result: `passed with skip`
   - notes:
     - `4 tests passed`
     - `1 test skipped`
     - skipped case requires `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD`

### Targeted runtime probes

1. resend throttle probe
   - request 1: `POST /api/auth/send-verify-email` with fresh forwarded IP
   - result: `200`
   - request 2: immediate repeat with same email and same IP
   - result: `429`

2. unauthenticated token-bridge probe
   - request: `POST /api/auth/convex-token`
   - result: `401`
   - expected payload: `{"error":"Authentication required"}`

3. invalid-credentials auth baseline
   - request: `POST /api/auth/sign-in`
   - result: `401`
   - expected payload: `AUTH_UNAUTHORIZED`

## Abnormal Scenario Coverage

Validated directly:

- resend-verification throttling
- invalid credential rejection
- auth rate-limit enforcement for repeated sign-in failures
- login-page validation and compliance messaging
- protected token bridge returns `401` when no authenticated session exists

Validated in browser E2E:

- resend-verification throttling UI behavior
- forgot-password privacy-safe messaging

Targeted but not fully certified in final handoff:

- full session-expiration, sign-out, and invalid-token-injection suite via `e2e/auth-session-resilience.spec.ts`
- full mail-driven auth lifecycle script via `scripts/run-auth-email-e2e.mjs`

Reason not certified:

- these deeper flows depend on slower external email delivery timing and need another clean run after the proxy/token-bridge remediation to produce stable evidence

## Findings

### Resolved

1. resend verification throttling was missing
   - severity: `high`
   - status: `fixed`

2. `/api/auth/convex-token` was subject to the brute-force auth-attempt limiter
   - severity: `high`
   - status: `fixed`

3. local public InsForge host drift between `.env.local` and `.insforge/project.json`
   - severity: `high`
   - status: `fixed previously and revalidated`

### Open

1. official smoke credentials missing locally
   - severity: `medium`
   - impact: prevents certification of the existing official-account success-path test
   - required action: populate `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD`

2. `DATABASE_URL` is not certified against the active staging backend
   - severity: `high`
   - impact: direct-Postgres modules cannot be declared staging-aligned with full confidence
   - required action: source the authoritative staging `DATABASE_URL` instead of deriving or reusing production lineage

3. Google social auth still appears to depend on legacy `/auth/google-login`
   - severity: `medium`
   - impact: social login path remains outside the verified InsForge-first auth surface
   - required action: migrate `components/auth/AuthWithSocial.jsx` to the active InsForge OAuth flow and validate provider configuration

## Reproduction Notes

### Reproduce the fixed resend-throttle defect

1. `POST /api/auth/send-verify-email` with a valid email
2. repeat the same request immediately with the same email and client identity
3. expected current behavior:
   - first response `200`
   - second response `429`
   - `Retry-After` header present

### Reproduce the pre-fix token-bridge limiter defect

1. authenticate successfully
2. trigger `/api/auth/convex-token` immediately after login
3. prior broken behavior:
   - route could be throttled under the shared `/api/auth/*` brute-force limiter
4. expected current behavior:
   - route is no longer classified as an auth-attempt endpoint

## Acceptance Summary

Task 1: Frontend End-to-End Authentication Flow Validation

- status: `partially complete`
- met:
  - password-auth browser validation baseline
  - resend and forgot-password UI security validation
  - abnormal resend-throttle scenario verified
- not yet fully met:
  - official-account success-path certification
  - final stable evidence pack for the deeper disposable-mail resilience suite

Task 2: InsForge Host Configuration Consistency Remediation

- status: `substantially complete`
- met:
  - public InsForge host drift resolved
  - runtime public-host consistency revalidated
  - configuration docs synchronized
- not yet fully met:
  - authoritative staging `DATABASE_URL` alignment

Task 3: Business Module Backend Link Verification/Migration (`auth`)

- status: `partially complete with critical fixes applied`
- met:
  - auth route mapping
  - token-bridge limiter defect fixed
  - resend-throttle defect fixed
  - route/unit/browser validation executed
- not yet fully met:
  - Google social-login migration
  - final deterministic evidence for the deepest mail-driven auth lifecycle harness
