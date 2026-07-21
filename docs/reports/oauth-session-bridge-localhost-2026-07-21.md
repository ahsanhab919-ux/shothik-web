# OAuth Session Bridge Report

Date: `2026-07-21`

## Objective

Complete the localhost session-persistence remediation for the InsForge Google
OAuth callback so the app can establish durable app-domain auth state after the
`insforge_code` redirect.

## Problem Summary

The prior callback flow exchanged `insforge_code` through the browser client and
then attempted a refresh-based bridge. The exchange reached the InsForge
backend, but localhost still failed to retain an authenticated app session.

Observed behavior before this remediation:

- callback reached `/auth/post-login?insforge_code=...`
- InsForge OAuth exchange request was observed
- localhost later behaved as anonymous on protected app routes

## Implemented Fix

### New local route

- Added `app/api/auth/oauth/exchange/route.ts`
- The route now uses server-side `createAuthActions({ cookies: await cookies(), ... })`
  so session cookies are written on the app domain during the exchange

### Provider update

- Updated `providers/AuthProvider.tsx`
- The provider now posts the callback code to `/api/auth/oauth/exchange`
- Successful exchange hydrates the user from the local route payload and removes
  `insforge_code` from the URL before continuing normal auth hydration

## Tests Added Or Updated

- Added `app/api/auth/oauth/exchange/route.test.ts`
- Updated `providers/AuthProvider.test.tsx`

Focused validation executed:

```bash
pnpm exec vitest run \
  app/api/auth/oauth/exchange/route.test.ts \
  providers/AuthProvider.test.tsx \
  app/api/auth/sign-in/route.test.ts \
  app/auth/post-login/__tests__/page.test.tsx
```

Result: passed

## Remaining Blocker

This remediation closes the localhost callback-bridge implementation gap, but
Batch 1 is not yet fully certified because authenticated `/api/projects` flows
still depend on the correct staging `DATABASE_URL`.

Current remaining Batch 1 gate:

1. supply the authoritative staging `DATABASE_URL`
2. rerun `/api/projects` validation
3. rerun authenticated smoke and final Google OAuth browser certification

## Outcome

- Local OAuth session persistence is now implemented on the app-route boundary
- The next executable blocker is environmental, not architectural: the staging
  database connection must be corrected before final auth/runtime certification
