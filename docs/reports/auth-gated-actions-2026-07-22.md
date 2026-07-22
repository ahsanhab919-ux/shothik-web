# Auth-Gated Action Normalization Report

## Objective

Normalize unauthenticated "use this feature" behavior across public discovery pages so guests can browse pages freely, but protected actions consistently prompt login instead of failing silently or showing generic runtime errors.

## Scope

- Book detail actions
- Community thread actions
- Native tool execution for paraphrase

## Implemented Changes

### Books

- Updated `app/(primary-layout)/books/[bookId]/page.tsx`
- Free book guest CTA now stays active and opens the shared login modal through the existing auth slice.
- Paid book guest CTA now shows `Sign in to Unlock` and opens the shared login modal instead of appearing as a disabled action.
- Existing authenticated purchase and download behavior remains unchanged.

### Community

- Updated `app/(primary-layout)/community/[forumId]/page.tsx`
- Guest `post`, `chat`, `reserve`, and `react` actions now:
  - set a clear inline error message
  - open the shared login modal
  - stop before hitting the Convex mutation
- Failure paths for authenticated users now keep explicit inline error messaging for reserve and reaction actions.

### Native Tools

- Updated `components/tools/paraphrase/ParaphraseContend.jsx`
- Guest paraphrase submission now opens the shared login modal before the request pipeline starts.
- This prevents the previous dropped-connection style error state from being shown to logged-out users.

## Validation

### Automated

- `pnpm exec vitest run "app/(primary-layout)/books/[bookId]/page.test.tsx"`
- `pnpm exec vitest run "app/(primary-layout)/community/[forumId]/page.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`

### Local Browser Verification

- `http://localhost:3001/paraphrase`
  - page stays public
  - submitting text opens the login prompt cleanly in place
- `http://localhost:3001/agents`
  - page stays public
  - starting a workflow opens an auth-required prompt in place
- `http://localhost:3001/marketplace`
  - page stays public
- `http://localhost:3001/community`
  - page stays public

## Issues Encountered

1. `localhost:3001` already had a dev server bound, so verification reused the running server instead of creating a second one.
2. Community thread live validation was blocked because the environment had no open forums or thread data to navigate into. A focused component regression test was added to cover guest `post`, `react`, and `reserve` behavior instead.
3. Disk pressure from regenerated `.next` output temporarily blocked file writes during implementation. The regenerated build output was removed to restore workspace capacity.

## Deliverables

- `app/(primary-layout)/books/[bookId]/page.tsx`
- `app/(primary-layout)/books/[bookId]/page.test.tsx`
- `app/(primary-layout)/community/[forumId]/page.tsx`
- `app/(primary-layout)/community/[forumId]/page.test.tsx`
- `components/tools/paraphrase/ParaphraseContend.jsx`
- `docs/reports/auth-gated-actions-2026-07-22.md`
