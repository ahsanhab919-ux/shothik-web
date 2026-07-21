# Staging Database URL Remediation

Date: `2026-07-21`

## Objective

Resolve the local staging environment drift where `.env.local`
`NEXT_PUBLIC_INSFORGE_URL` pointed to the active staging InsForge host while
`DATABASE_URL` still pointed to the older production-lineage database host.

## Root Cause

The local environment mixed two different backend lineages:

- app/auth host:
  - `https://ers8j28a-kj5.ap-southeast.insforge.app`
- database host:
  - `ers8j28a.ap-southeast.database.insforge.app`

That mismatch caused direct Postgres-backed routes such as `/api/projects` to
query the wrong database lineage, where the required `public.projects` schema
was not present.

## Remediation Path

1. Re-authenticated and re-linked the repo to the correct InsForge project:
   - project: `staging-chat-auth`
   - project id: `24457530-09ee-41d7-97d1-4519e23e3dc3`
2. Used browser automation to inspect the InsForge dashboard path and identify
   the exact protected endpoints used to reveal database credentials.
3. Used the authenticated backend path to retrieve the authoritative staging
   database password.
4. Updated `.env.local` so `DATABASE_URL` now targets:
   - host: `ers8j28a-kj5.ap-southeast.database.insforge.app`
5. Revalidated connectivity and schema presence against the updated env file.

## Updated Local State

`.env.local` now aligns:

- `NEXT_PUBLIC_INSFORGE_URL=https://ers8j28a-kj5.ap-southeast.insforge.app`
- `DATABASE_URL=postgresql://postgres:<staging-password>@ers8j28a-kj5.ap-southeast.database.insforge.app:5432/insforge?sslmode=require`

## Validation

### Credential audit

```bash
pnpm audit:credentials
```

Result:

- core InsForge platform baseline is `ready`

### Direct database validation

Validated via `.env.local`:

- connected successfully to `insforge` as `postgres`
- `to_regclass('public.projects')` resolved to `projects`
- `public.projects` exists on the corrected staging lineage

### App-level validation

Started local dev server with `.env.local` and ran:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
pnpm exec playwright test \
  e2e/authenticated-core-smoke.spec.ts \
  e2e/smoke.spec.ts \
  --project=chrome-stable
```

Result:

- `3 passed`
- `2 skipped`

The authenticated smoke that exercises `/api/projects` now passes.

## Outcome

- Local host drift is resolved end to end
- `.env.local` now targets the same staging InsForge lineage for both auth/app
  host and Postgres
- The repo is locally runnable again for the authenticated core smoke path
