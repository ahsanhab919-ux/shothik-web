# Books Phase 1 Staging Smoke Report

Date: `2026-07-17`
Environment: `https://staging.shothikgpt.com`
Prepared by: `TRAE`

## Summary

This report captures the current end-to-end staging validation status for the
Books Phase 1 migration and the related staging data bootstrap work.

## Executed Checks

### 1. Public staging smoke

Command:

```bash
PLAYWRIGHT_BASE_URL=https://staging.shothikgpt.com pnpm exec playwright test e2e/smoke.spec.ts --reporter=line
```

Observed result:

- `2 passed`
- `2 skipped`

Interpretation:

- public route reachability passed
- authenticated browser smoke remained deferred because no compliant smoke
  credentials were available in the active workspace env resolution path

### 2. Role credential discovery

Verified:

- repo env resolution only exposes placeholders in `.env.example`
- no active values were available for:
  - `PLAYWRIGHT_SMOKE_EMAIL`
  - `PLAYWRIGHT_SMOKE_PASSWORD`
- no staging role-specific creator/admin/reader credentials were present in the
  current shell or repo-local env loading path

### 3. Representative data bootstrap preparation

Prepared artifacts:

- [books-phase1-staging-seed.json](file:///Users/user/Pictures/shothik.2/shothik-web/scripts/fixtures/books-phase1-staging-seed.json)
- [seed-books-phase1-staging.ts](file:///Users/user/Pictures/shothik.2/shothik-web/scripts/seed-books-phase1-staging.ts)
- `pnpm seed:books:staging`

Prepared scope:

- creator-owned draft
- submitted moderation queue item
- approved pre-publication item
- published reader-owned item
- published reader-available item
- rejected creator recovery item
- unpublished catalog-exclusion item

### 4. Live seed execution attempts

Observed outcome:

- staging bucket upload path is valid through `npx @insforge/cli storage upload`
- local app bootstrap path is valid and runs with `.env.local`
- automated role-account creation is currently blocked before full seed
  completion

## Anomalies

### A1. Authenticated smoke credentials unavailable

Impact:

- creator, administrator, and reader smoke workflows cannot be executed end to
  end from this session

Evidence:

- local env resolution returned `hasSmokeEmail=false`
- Playwright authenticated smoke remains skipped by design without credentials

### A2. Automated staging role bootstrap is unstable

Impact:

- the representative staging seed dataset cannot be fully populated yet through
  the prepared script

Evidence:

- direct role sign-up attempts returned either `Request blocked` or timed out
  through the app sign-up route
- direct auth-user verification did not return durable seeded role users after
  those failed bootstrap attempts

### A3. No compliant pre-provisioned creator/admin/reader accounts were found

Impact:

- the intended role-based smoke chain cannot reuse existing approved test
  identities yet

## R&D Follow-Up

1. provide or confirm compliant staging credentials for:
   - creator
   - administrator
   - reader
2. confirm whether staging sign-up should be allowed for automated seed users or
   intentionally blocked
3. if self-service sign-up is intentionally blocked, provision the three role
   accounts centrally and rerun:

```bash
STAGING_APP_URL=http://localhost:3000 pnpm seed:books:staging
PLAYWRIGHT_BASE_URL=https://staging.shothikgpt.com pnpm exec playwright test e2e/smoke.spec.ts --reporter=line
```

## Current Recommendation

Treat Books Phase 1 staging as:

- `public reachability: verified`
- `schema/storage readiness: verified`
- `representative seed tooling: prepared`
- `full authenticated smoke: blocked pending compliant role credentials or
  approved staging role provisioning`
