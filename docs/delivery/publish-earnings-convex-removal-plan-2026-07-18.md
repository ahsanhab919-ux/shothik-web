# Publish Earnings Convex Removal Plan

Date: `2026-07-18`
Status: `Completed`
Scope: writing-studio publish earnings and payout surfaces after publish-state cutover

## Completed Work Items

The current migration lane has already completed these writing-studio steps:

1. Cross-browser lifecycle gate
   - create, save, reopen, version restore, and delete passed across Chrome
     Stable, Firefox Stable, Safari-equivalent WebKit, and Edge Stable
2. Residual Convex audit
   - editor, publishing, backend bridge, and global runtime dependencies were
     inventoried and ranked
3. Active editor-path cutover
   - removed `useConvexAutosave`
   - moved character persistence to `project.settings.characters`
4. Legacy shell cutover
   - removed direct Convex usage from:
     - `components/writing-studio/IntegratedWritingStudio.tsx`
     - `components/writing-studio/containers/ProjectContainer.tsx`
   - preserved section-draft compatibility under
     `project.settings.legacySectionDrafts`
5. Publish-state cutover
   - removed publish notifications, tax profile, and distribution record
     persistence from Convex
   - added InsForge-backed publish routes, services, schema, and focused tests
6. Control framework
   - weighted prioritization, completion criteria, handoff rules, and review
     checkpoints are documented in
     `docs/delivery/sequential-prioritization-framework.md`

## Remaining Pending Tasks

### Current highest-value slice

- completed:
  - `hooks/useEarnings.js`
  - `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
  - `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`
  - `app/api/stripe/connect/route.ts`
  - `app/api/stripe/payout/route.ts`

### Backend bridge slice after earnings

- `app/api/writing-studio/notify-master/route.ts`
- `lib/writing-studio/buildStore.ts`
- `app/api/latex/status/[buildId]/route.ts`

### Final runtime bridge slice

- `app/api/auth/convex-token/route.ts`
- `lib/convex-auth.ts`
- `app/api/.well-known/jwks.json/route.ts`
- `providers/ConvexClientProvider.jsx`

## Newly Confirmed Gaps

The repo audit and code search confirmed these earnings surfaces initially lacked
InsForge-backed replacements:

- author sales-record persistence
- author payout-account persistence
- author payout-request persistence
- authenticated summary/history/account routes for the earnings dashboard
- focused route and component tests for the earnings replacement seam

Additional directly related residual legacy behavior discovered during this
review:

- `app/api/stripe/connect/route.ts` depended on bearer-token parsing and
  Convex-backed payout account persistence
- `app/api/stripe/payout/route.ts` depended on bearer-token parsing,
  Convex-backed payout account lookup, and Convex-backed payout recording

## Technical Requirements For Current Slice

### 1. Earnings summary replacement

Requirements:

- support authenticated summary reads for the current author
- preserve the dashboard payload contract used by `EarningsDashboard.jsx`
- compute available balance, paid balance, pending payouts, monthly breakdown,
  and per-book earnings without Convex
- keep owner scoping for all earnings reads

Implementation logic:

- add an InsForge-backed sales record store keyed by `auth_user_id` and `book_id`
- aggregate royalty totals, unit counts, revenue totals, and recent-month
  breakdowns in a service-layer query
- expose a same-origin authenticated route for summary reads

### 2. Payout account replacement

Requirements:

- support authenticated read and upsert for payout accounts
- preserve the current UI account payload used by `PayoutManager.jsx`
- support Stripe Connect account id, onboarding completion state, Payoneer
  account metadata, bank-transfer metadata, and default-account flags
- keep sensitive payout metadata server-controlled where possible

Implementation logic:

- add an author payout account table keyed by `auth_user_id` and `method`
- expose authenticated fetch and save routes for payout account reads and writes
- update the Stripe Connect route to persist account linkage and onboarding
  state through the new InsForge service instead of Convex

### 3. Payout request and history replacement

Requirements:

- support authenticated payout-history reads and payout-request creation
- preserve the current `PayoutManager.jsx` rendering contract for status, amount,
  period, and method fields
- support completed, pending, processing, failed, and cancelled payout states
- allow Stripe payout recording to land in the same InsForge-backed history
  store

Implementation logic:

- add an author payouts table keyed by `auth_user_id`
- expose an authenticated route to list payout history and create payout
  requests
- update the Stripe payout route to resolve the preferred Stripe account from
  the new payout-account store and record completed transfers through the new
  payout service

### 4. Hook and UI cutover

Requirements:

- remove `convex/react` imports from `hooks/useEarnings.js`
- preserve existing loading, error, and callback behavior in the dashboard and
  payout manager
- use same-origin authenticated fetch flows aligned with the current session
  standard

Implementation logic:

- `useEarnings()` loads summary through an authenticated Next.js route
- `usePayouts()` loads history and payout accounts through authenticated routes
- `usePayouts()` sends payout requests and payout-account saves through the new
  routes
- `PayoutManager.jsx` keeps Stripe onboarding via `/api/stripe/connect`, but the
  route writes to InsForge-backed payout accounts

## Delivery Standards

Every remaining task in this slice must meet all of these standards:

1. Security
   - authenticated routes must enforce owner-scoped access
   - no Convex token bridge or bearer-token-only path may be reintroduced for
     earnings flows
   - Stripe account ownership must be validated before payout execution
2. Backward compatibility
   - dashboard and payout UI payload shapes remain stable unless the component is
     updated in the same slice
   - payout and account rows preserve the fields already rendered by the UI
3. Validation
   - repo-level `pnpm exec tsc --noEmit`
   - focused route and component tests for the replacement surfaces
   - residual grep proving the targeted earnings files no longer import
     `convex/react` or `api.earnings`
4. Documentation
   - update the Convex audit, current progress log, and execution plan after the
     slice passes
5. Sequencing discipline
   - do not begin the backend bridge slice or runtime bridge slice until the
     current earnings slice is implemented, tested, validated, and documented

## Execution Order For Current Slice

1. add the missing InsForge schema and service methods for sales records, payout
   accounts, and payouts
2. add authenticated earnings and payout routes plus route-safe validation
3. migrate `app/api/stripe/connect/route.ts` and `app/api/stripe/payout/route.ts`
   to the new service and session-auth standard
4. migrate `hooks/useEarnings.js`, `EarningsDashboard.jsx`, and
   `PayoutManager.jsx` to authenticated route fetches
5. add focused route and component tests
6. run type-check and focused regression validation
7. update delivery artifacts and re-rank the next ready slice

## Completion Summary

This slice is complete.

Delivered:

- InsForge schema for author sales records, payout accounts, and payout history
- `lib/books/insforge-earnings-service.ts` for earnings aggregation, payout
  account persistence, payout requests, and Stripe transfer recording
- authenticated earnings and payout routes:
  - `/api/publish/earnings`
  - `/api/publish/payouts`
  - `/api/publish/payout-accounts`
- session-auth cutover for:
  - `app/api/stripe/connect/route.ts`
  - `app/api/stripe/payout/route.ts`
- UI and hook cutover for:
  - `hooks/useEarnings.js`
  - `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
  - `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`
- focused route and component tests for the replacement seam

Validation:

- `CI=1 pnpm vitest run app/api/publish/earnings/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run app/api/publish/payouts/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run app/api/publish/payout-accounts/route.test.ts app/api/stripe/connect/route.test.ts app/api/stripe/payout/route.test.ts --reporter=dot`
- `CI=1 pnpm vitest run components/tools/writing-studio/workspace/publish/EarningsDashboard.test.jsx components/tools/writing-studio/workspace/publish/PayoutManager.test.jsx --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718113000_books-phase2-earnings-core.sql`
- residual grep confirmed the targeted earnings files no longer import
  `convex/react`, `api.earnings`, `ConvexHttpClient`, or `NEXT_PUBLIC_CONVEX_URL`

Next ranked task:

- `app/api/writing-studio/notify-master/route.ts`
- `lib/writing-studio/buildStore.ts`
- `app/api/latex/status/[buildId]/route.ts`
