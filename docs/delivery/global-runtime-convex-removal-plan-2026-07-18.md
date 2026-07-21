# Global Runtime Convex Removal Plan

Date: `2026-07-18`
Status: `Completed`
Scope: final Convex auth/runtime bridge retirement for the active Phase 4 lane

## Core Requirements

1. Retire the final bridge wrappers
   - `app/api/auth/convex-token/route.ts`
   - `lib/convex-auth.ts`
   - `app/api/.well-known/jwks.json/route.ts`
   - `providers/ConvexClientProvider.jsx`
2. Preserve active behavior for adjacent callers that still depended on those
   wrappers:
   - twin session/key authentication
   - twin route activity logging
   - book export convert/validate access
   - locale preference load/sync flows
3. Remove direct runtime dependence on `convex/react`, `ConvexHttpClient`, and
   Convex token exchange from the active lane
4. Pass focused tests, repo type-check, residual grep, and backend migration
   apply for any newly required persistence

## Success Metrics

- the bridge wrappers no longer import or create live Convex clients
- `lib/twin-api-auth.ts`, `lib/twin-route-guard.ts`,
  `app/api/books/export/convert/route.ts`,
  `app/api/books/export/validate/route.ts`,
  `i18n/useLoadConvexLocale.ts`, and `i18n/useSyncLocaleToConvex.ts`
  no longer depend on Convex runtime helpers
- focused validation passes
- the next active step becomes final regression, config cleanup, and phase
  closeout

## Implementation Logic

1. Added `migrations/20260718152000_phase4-twin-activity-log.sql` so twin route
   activity logging no longer depends on Convex
2. Expanded `lib/twin/insforge-twin-service.ts` with:
   - twin lookup by master id
   - twin profile lookup by key hash
   - twin activity logging
3. Migrated `lib/twin-api-auth.ts` and `lib/twin-route-guard.ts` off Convex
   token-backed clients
4. Migrated export routes to InsForge book access and InsForge twin owner
   resolution
5. Replaced locale Convex hooks with local preference persistence
6. Retired the global bridge wrappers:
   - `convex-token` route now returns `410`
   - JWKS route now returns `410`
   - `ConvexClientProvider` is a no-op passthrough
   - `lib/convex-auth.ts` is a retired compatibility stub

## Completion Summary

This slice is complete.

Delivered:

- final retirement of the active Convex auth/runtime bridge
- InsForge-backed twin auth/activity support for the remaining server callers
- InsForge/local preference replacements for export and locale callers
- focused tests for retired routes, twin auth, and export access

Validation:

- `CI=1 pnpm vitest run app/api/auth/convex-token/route.test.ts 'app/api/.well-known/jwks.json/route.test.ts' lib/twin-api-auth.test.ts app/api/books/export/convert/route.test.ts app/api/books/export/validate/route.test.ts --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718152000_phase4-twin-activity-log.sql`
- residual grep confirmed the retired bridge files and their migrated caller
  seam no longer import live Convex runtime helpers

Next ranked task:

- final regression, config cleanup, and technical-document alignment
- phase closeout and next-phase handoff publication
