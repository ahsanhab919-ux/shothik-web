# Backend Bridge Convex Removal Plan

Date: `2026-07-18`
Status: `Completed`
Scope: writing-studio backend compatibility bridge after publish earnings cutover

## Core Requirements

1. Twin notification bridge
   - `app/api/writing-studio/notify-master/route.ts` must stop using
     `api.twin.getByKeyHash` and `api.agent_notifications.createNotification`
   - twin API key validation must still resolve the calling twin and reject
     unknown or suspended keys
   - the route must preserve the current notification payload contract and
     best-effort email behavior
2. Render-status bridge
   - `lib/writing-studio/buildStore.ts` must stop using `api.latex.*`
   - build creation, update, and fallback read behavior must persist through an
     InsForge-backed render-job store
   - `app/api/latex/status/[buildId]/route.ts` must keep the existing response
     contract while reading the replacement store
3. Quality gates
   - target files must no longer import direct project-specific Convex APIs
   - focused route and unit tests must pass
   - repo-level `pnpm exec tsc --noEmit` must pass
   - the new schema must be applied to the linked backend

## Success Metrics

- `notify-master`, `buildStore`, and `latex/status` no longer reference
  `ConvexHttpClient`, `api.twin.*`, `api.agent_notifications.*`, or `api.latex.*`
- focused validation passes:
  - `app/api/writing-studio/notify-master/route.test.ts`
  - `app/api/latex/status/[buildId]/route.test.ts`
  - `lib/writing-studio/buildStore.test.ts`
- InsForge migration apply succeeds for the bridge schema
- the next ready slice becomes the final global Convex auth/runtime bridge

## Implementation Logic

1. Added a minimal bridge schema in
   `migrations/20260718143000_phase4-twin-render-bridge.sql`:
   - `public.twins`
   - `public.twin_notifications`
   - `public.book_render_jobs`
2. Added shared services:
   - `lib/twin/insforge-twin-service.ts`
   - `lib/publishing/insforge-render-service.ts`
3. Cut over the target bridge files:
   - `app/api/writing-studio/notify-master/route.ts`
   - `lib/writing-studio/buildStore.ts`
   - `app/api/latex/status/[buildId]/route.ts`
4. Added focused tests for the replacement seam
5. Applied the migration and revalidated the slice

## Completion Summary

This slice is complete.

Delivered:

- InsForge-backed twin lookup and twin notification persistence for
  `notify-master`
- InsForge-backed render-job persistence for LaTeX build tracking
- local-file plus InsForge fallback behavior in `buildStore` without Convex
- focused route and build-store tests

Validation:

- `CI=1 pnpm vitest run app/api/writing-studio/notify-master/route.test.ts 'app/api/latex/status/[buildId]/route.test.ts' lib/writing-studio/buildStore.test.ts --reporter=dot`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`
  - applied `20260718143000_phase4-twin-render-bridge.sql`
- residual grep confirmed no targeted bridge file still imports direct
  project-specific Convex APIs

Next ranked task:

- `app/api/auth/convex-token/route.ts`
- `lib/convex-auth.ts`
- `app/api/.well-known/jwks.json/route.ts`
- `providers/ConvexClientProvider.jsx`
