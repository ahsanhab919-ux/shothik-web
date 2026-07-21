# Writing Studio Residual Convex Audit

Date: 2026-07-18
Scope: Post-browser-gate audit of remaining project-specific Convex dependencies in the writing-studio container
Status: Audit complete

## Summary

The project lifecycle core is already migrated to InsForge-backed `projects`
and `project_versions`.

The active writing-studio Convex removal lane is now technically complete.

Residual Convex usage still exists elsewhere in the wider product, but the
writing-studio phase no longer depends on project-specific Convex storage,
backend compatibility bridges, or the global Convex auth/runtime wrapper.

## UI Inventory

### Editor and project surfaces

| File | Remaining Convex dependency | Current use case | Replacement direction |
| --- | --- | --- | --- |
| `components/writing-studio/PolishedWriteView.tsx` | `useConvexAutosave` | Legacy autosave restore path | Remove Convex hook and route autosave through generalized persistence |
| `hooks/useConvexAutosave.ts` | `api.writing.autosave`, `api.writing.getAutosave` | Legacy autosave storage | Replace with generalized draft autosave abstraction or remove if superseded |
| `components/writing-studio/nobel/CharacterPanel.tsx` | `api.writing.saveCharacters`, `api.writing.getCharacters` | Character metadata persistence | Replace with InsForge-backed character persistence service |

### Publishing surfaces inside writing-studio

| File | Remaining Convex dependency | Current use case | Replacement direction |
| --- | --- | --- | --- |
| `hooks/useEarnings.js` | completed | Earnings summary, payouts, payout accounts | Replaced with authenticated InsForge-backed route fetches |
| `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx` | completed | Publishing earnings UI | Cut over with the earnings service route replacement |
| `components/tools/writing-studio/workspace/publish/PayoutManager.jsx` | completed | Payout management UI | Cut over with the earnings service route replacement |

## Backend and compatibility inventory

| File | Remaining Convex dependency | Current use case | Replacement direction |
| --- | --- | --- | --- |
| `app/api/writing-studio/notify-master/route.ts` | `api.twin.getByKeyHash`, `api.agent_notifications.createNotification` | Agent-key lookup and notification creation | Replace with InsForge twin lookup + notification insert |
| `lib/writing-studio/buildStore.ts` | `api.latex.*` fallback | LaTeX build state fallback storage | Replace with `book_render_jobs` persistence service |
| `app/api/latex/status/[buildId]/route.ts` | imports `getBuildById` fallback | Render status fallback path | Remove Convex fallback after InsForge render persistence is complete |
| `app/api/auth/convex-token/route.ts` | completed | Retired token bridge route | Now returns `410` because the active lane no longer exchanges Convex tokens |
| `lib/convex-auth.ts` | completed | Retired compatibility helper | Reduced to a retired compatibility stub |
| `app/api/.well-known/jwks.json/route.ts` | completed | Retired JWKS bridge route | Now returns `410` because the active lane no longer uses Convex JWT verification |
| `providers/ConvexClientProvider.jsx` | completed | Retired global provider bridge | Reduced to a no-op passthrough wrapper |

## Classification

### Project-specific Convex APIs still in use

- `api.projects.*`
- `api.writing.*`
- `api.books.*`
- `api.publishing.*`
- `api.earnings.*`

### Generic Convex runtime still in use

- residual non-phase Convex consumers remain elsewhere in the product, but the
  active Phase 4 writing-studio lane no longer requires live global Convex auth
  or provider runtime wrappers

## Recommended removal order

1. Remove editor/project persistence leftovers
   - `IntegratedWritingStudio.tsx`
   - `ProjectContainer.tsx`
   - `useConvexAutosave.ts`
   - `CharacterPanel.tsx`

2. Complete final regression and cleanup for the now-retired global bridge

## Execution Update: 2026-07-18

### Completed highest-value slice

The first execution slice after the browser gate is complete.

Files changed:

- `hooks/useProjectPersistence.ts`
- `hooks/useProjectCharacters.ts`
- `components/writing-studio/nobel/CharacterPanel.tsx`
- `components/writing-studio/PolishedWriteView.tsx`
- `hooks/useConvexAutosave.ts` removed

Completed outcomes:

- `saveProjectDraft()` now supports settings-only saves, which allows targeted
  persistence updates without forcing content writes
- character persistence moved from `api.writing.getCharacters` and
  `api.writing.saveCharacters` into `project.settings.characters`
- the active editor path no longer imports the legacy `useConvexAutosave`
  bridge
- the obsolete `useConvexAutosave.ts` file was deleted after its active-path
  consumers were removed

### Validation evidence

- `pnpm exec tsc --noEmit`
- `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright test e2e/writing-studio-lifecycle.spec.ts --project=chrome-stable`
- focused browser verification confirmed that a newly created character profile
  persisted after reload

### Current residual inventory after slice 1

The editor/project category is reduced but not yet closed. The highest-value
remaining files in that category are now:

- `components/writing-studio/IntegratedWritingStudio.tsx`
- `components/writing-studio/containers/ProjectContainer.tsx`

These files still matter more than publishing-surface cleanup because they sit
closer to the writing-studio shell and block later deletion of the global
Convex auth/runtime bridge.

### Completed follow-up slice: legacy shell containers

The second execution slice is now complete.

Files changed:

- `components/writing-studio/IntegratedWritingStudio.tsx`
- `components/writing-studio/containers/ProjectContainer.tsx`

Completed outcomes:

- `IntegratedWritingStudio.tsx` now loads projects and saves versions through
  `useProjectPersistence` instead of `api.projects.get` and
  `api.projects.saveVersion`
- `ProjectContainer.tsx` now loads project state through the generalized
  project persistence hook instead of `api.projects.get`
- the legacy section-draft bridge now persists authenticated migration data
  under `project.settings.legacySectionDrafts` instead of
  `api.writing.getSections` and `api.writing.saveSections`
- the compatibility shell no longer writes empty section payloads back into
  project content, which avoids unintended overwrite risk when no legacy section
  drafts exist

### Validation evidence for slice 2

- `pnpm exec tsc --noEmit`
- `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright test e2e/writing-studio-lifecycle.spec.ts --project=chrome-stable`
- residual grep check confirmed no direct Convex client usage remains under
  `components/writing-studio`

### Completed follow-up slice: publish surfaces

The third execution slice is now complete.

Files changed:

- `migrations/20260718093000_books-phase2-publishing-core.sql`
- `lib/books/insforge-publishing-service.ts`
- `app/api/books/notifications/route.ts`
- `app/api/publish/tax/route.ts`
- `app/api/publish/submit/route.ts`
- `app/api/publish/status/route.ts`
- `app/api/webhooks/publishdrive/route.ts`
- `components/tools/writing-studio/workspace/publish/NotificationBell.jsx`
- `components/tools/writing-studio/workspace/publish/DistributionManager.jsx`
- `components/tools/writing-studio/workspace/publish/TaxInformationStep.jsx`
- `components/books/DistributionStatusPanel.tsx`

Completed outcomes:

- publish notifications now read and mark-read through authenticated Next.js
  routes backed by InsForge tables, not `api.books.*`
- tax profile persistence now uses `author_tax_profiles` with server-side
  hashed tax identifiers and masked last-four handling
- distribution status and webhook reconciliation now use
  `book_distribution_records` and `book_distribution_channels`
- the publish submit, status, and webhook routes no longer import direct
  project-specific Convex publishing or notification stores
- `DistributionStatusPanel.tsx` was also migrated after the residual scan found
  it still depended on `api.publishing.getDistributionRecord`

### Validation evidence for slice 3

- `pnpm vitest run app/api/books/notifications/route.test.ts app/api/publish/tax/route.test.ts app/api/publish/status/route.test.ts app/api/publish/submit/route.test.ts components/tools/writing-studio/workspace/publish/NotificationBell.test.jsx components/tools/writing-studio/workspace/publish/TaxInformationStep.test.jsx`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718093000_books-phase2-publishing-core.sql` to the linked
    `staging-chat-auth` backend
- residual grep confirmed the publish-side UI no longer imports `convex/react`

### Completed follow-up slice: earnings and payouts

The fourth execution slice is now complete.

Files changed:

- `migrations/20260718113000_books-phase2-earnings-core.sql`
- `lib/books/insforge-earnings-service.ts`
- `app/api/publish/earnings/route.ts`
- `app/api/publish/payouts/route.ts`
- `app/api/publish/payout-accounts/route.ts`
- `app/api/stripe/connect/route.ts`
- `app/api/stripe/payout/route.ts`
- `hooks/useEarnings.js`
- `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
- `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`

Completed outcomes:

- author earnings summary, payout accounts, and payout history now persist
  through InsForge-backed tables instead of `api.earnings.*`
- the earnings dashboard and payout manager now use authenticated same-origin
  route fetches instead of `convex/react`
- the Stripe Connect and Stripe payout routes now use session-backed auth and
  the InsForge earnings service instead of bearer-token parsing plus Convex
  persistence
- the publish-side earnings lane no longer imports `convex/react`,
  `ConvexHttpClient`, or `NEXT_PUBLIC_CONVEX_URL`

### Validation evidence for slice 4

- `CI=1 pnpm vitest run app/api/publish/earnings/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run app/api/publish/payouts/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run app/api/publish/payout-accounts/route.test.ts app/api/stripe/connect/route.test.ts app/api/stripe/payout/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run components/tools/writing-studio/workspace/publish/EarningsDashboard.test.jsx components/tools/writing-studio/workspace/publish/PayoutManager.test.jsx --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718113000_books-phase2-earnings-core.sql` to the linked
    `staging-chat-auth` backend
- residual grep confirmed no targeted earnings file still imports legacy Convex
  client dependencies

### Completed follow-up slice: backend compatibility bridge

The fifth execution slice is now complete.

Files changed:

- `migrations/20260718143000_phase4-twin-render-bridge.sql`
- `lib/twin/insforge-twin-service.ts`
- `lib/publishing/insforge-render-service.ts`
- `app/api/writing-studio/notify-master/route.ts`
- `lib/writing-studio/buildStore.ts`
- `app/api/latex/status/[buildId]/route.ts`

Completed outcomes:

- `notify-master` now resolves twin API keys and stores notifications through
  InsForge-backed tables instead of `api.twin.*` and
  `api.agent_notifications.*`
- LaTeX build creation, update, and fallback reads now use
  `public.book_render_jobs` instead of `api.latex.*`
- the backend bridge target files no longer import direct project-specific
  Convex APIs

### Validation evidence for slice 5

- `CI=1 pnpm vitest run app/api/writing-studio/notify-master/route.test.ts 'app/api/latex/status/[buildId]/route.test.ts' lib/writing-studio/buildStore.test.ts --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718143000_phase4-twin-render-bridge.sql` to the linked
    `staging-chat-auth` backend
- residual grep confirmed no targeted bridge file still imports
  `ConvexHttpClient`, `api.twin.*`, `api.agent_notifications.*`, or
  `api.latex.*`

## Current assessment

- Browser parity gate: passed
- Convex audit: complete
- Convex removal:
  - slice 1 complete for active editor-path autosave and character persistence
  - slice 2 complete for legacy wrapper/container shell consumers
  - slice 3 complete for publish notifications, tax profile, and distribution
    status surfaces
  - slice 4 complete for publish earnings and payout surfaces
  - slice 5 complete for backend compatibility bridge consumers
  - slice 6 complete for the final active global-runtime bridge consumers
- Regression requirement:
  - completed for slices 1 through 3 with targeted tests and type-check
- Next highest-value ready slice:
  - final regression, config cleanup, and technical-document alignment

### Completed follow-up slice: final global runtime bridge

The sixth execution slice is now complete.

Files changed:

- `migrations/20260718152000_phase4-twin-activity-log.sql`
- `lib/twin/insforge-twin-service.ts`
- `lib/twin-api-auth.ts`
- `lib/twin-route-guard.ts`
- `app/api/books/export/convert/route.ts`
- `app/api/books/export/validate/route.ts`
- `i18n/useLoadConvexLocale.ts`
- `i18n/useSyncLocaleToConvex.ts`
- `providers/ConvexClientProvider.jsx`
- `providers/index.jsx`
- `app/api/auth/convex-token/route.ts`
- `app/api/.well-known/jwks.json/route.ts`
- `lib/convex-auth.ts`

Completed outcomes:

- the final active Convex token, JWKS, and provider bridge is retired
- twin auth, twin route activity logging, and export book access now use
  InsForge-backed services instead of the Convex token helper chain
- locale load/sync no longer depends on `convex/react`
- the active lane no longer requires live Convex runtime wrappers

### Validation evidence for slice 6

- `CI=1 pnpm vitest run app/api/auth/convex-token/route.test.ts 'app/api/.well-known/jwks.json/route.test.ts' lib/twin-api-auth.test.ts app/api/books/export/convert/route.test.ts app/api/books/export/validate/route.test.ts --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718152000_phase4-twin-activity-log.sql` to the linked
    `staging-chat-auth` backend
- residual grep confirmed the retired bridge files and the migrated caller seam
  no longer import live Convex runtime helpers
