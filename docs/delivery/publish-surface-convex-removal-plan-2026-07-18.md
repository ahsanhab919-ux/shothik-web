# Publish Surface Convex Removal Plan

Date: `2026-07-18`
Status: `Completed`
Scope: writing-studio publish surfaces after editor and shell Convex removal

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
5. Control framework
   - weighted prioritization, completion criteria, handoff rules, and review
     checkpoints are documented in
     `docs/delivery/sequential-prioritization-framework.md`
6. Tooling research
   - TypeScript 7 evaluation completed and documented; direct adoption deferred

## Remaining Pending Tasks

### Current highest-value slice

- `components/tools/writing-studio/workspace/publish/NotificationBell.jsx`
- `components/tools/writing-studio/workspace/publish/DistributionManager.jsx`
- `components/tools/writing-studio/workspace/publish/TaxInformationStep.jsx`
- `components/books/DistributionStatusPanel.tsx`
- `app/api/publish/submit/route.ts`
- `app/api/publish/status/route.ts`
- `app/api/webhooks/publishdrive/route.ts`

### Next pending slice after publish surfaces

- `hooks/useEarnings.js`
- `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
- `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`

### Backend bridge slice after publish surfaces

- `app/api/writing-studio/notify-master/route.ts`
- `lib/writing-studio/buildStore.ts`
- `app/api/latex/status/[buildId]/route.ts`

### Final runtime bridge slice

- `app/api/auth/convex-token/route.ts`
- `lib/convex-auth.ts`
- `app/api/.well-known/jwks.json/route.ts`
- `providers/ConvexClientProvider.jsx`

## Newly Confirmed Gaps

The repo audit and code search show these backend surfaces do not yet have
InsForge-backed replacements:

- publish notifications
- author tax profile persistence
- book distribution record persistence
- publish-side tests for routes and UI

Additional residual dependency discovered during this review:

- `components/books/DistributionStatusPanel.tsx` still reads distribution status
  through `api.publishing.getDistributionRecord`

## Technical Requirements For Current Slice

### 1. Notification replacement

Requirements:

- support unread notification reads for the authenticated user
- support mark-one and mark-many as read
- preserve the UI payload contract used by `NotificationBell.jsx`
- allow distribution submit and webhook flows to create publish-side
  notifications without Convex

Implementation logic:

- add an InsForge-backed notification store keyed by `auth_user_id`
- store distribution-related notification metadata, including `book_id`,
  `notification_type`, `title`, `message`, `payload`, `read_at`, and timestamps
- provide route handlers for:
  - list unread notifications
  - mark notifications as read

### 2. Tax profile replacement

Requirements:

- support authenticated read and upsert for the current author
- preserve the current `TaxInformationStep.jsx` save semantics, including the
  `UNCHANGED` placeholder behavior for masked tax identifiers
- keep sensitive tax identifiers server-only and never echo the full value back
  to the client

Implementation logic:

- add an author tax profile table keyed by `auth_user_id`
- store the encrypted or masked tax identifier representation plus form type,
  country, legal name, address, city, postal code, treaty flags, and
  withholding rate
- expose an authenticated route for fetch and save
- return only the fields needed to prefill the form and indicate whether a tax
  ID already exists on file

### 3. Distribution record replacement

Requirements:

- support create, read by book, read by PublishDrive book id, and status update
- preserve the route contract already used by `/api/publish/submit` and
  `/api/publish/status`
- support per-channel status, URLs, retry updates, and webhook reconciliation
- preserve owner guards for reads and writes

Implementation logic:

- add a distribution record table keyed by `book_id`
- add a related channel-status table keyed by distribution record id and channel
  id
- move the submit route, status route, and webhook route from Convex-backed
  persistence to the InsForge book publishing service
- keep PublishDrive API integration unchanged for this slice; only replace the
  state store and notification path

### 4. UI cutover

Requirements:

- remove `convex/react` imports from the current publish-side UI and panel
  consumer
- preserve existing behavior, status rendering, retry flow, and callbacks
- use same-origin authenticated fetch flows aligned with the current session
  standard

Implementation logic:

- `NotificationBell.jsx` calls authenticated Next.js routes for unread list and
  mark-read actions
- `TaxInformationStep.jsx` calls authenticated tax profile routes for load and
  save
- `DistributionManager.jsx` and `DistributionStatusPanel.tsx` read distribution
  status through `/api/publish/status` and keep `/api/publish/submit` as the
  write path

## Delivery Standards

Every remaining task in this slice must meet all of these standards:

1. Security
   - authenticated routes must enforce owner-scoped access
   - sensitive tax fields must not be returned in full
   - no legacy Convex token bridge may be reintroduced
2. Backward compatibility
   - UI payload shapes remain stable unless the component is updated in the same
     slice
   - PublishDrive submission behavior remains functionally equivalent
3. Validation
   - repo-level `pnpm exec tsc --noEmit`
   - focused route and component tests for the replacement surfaces
   - focused lifecycle regression for writing-studio publish behavior where
     applicable
4. Documentation
   - update the Convex audit, current progress log, and execution plan after the
     slice passes
5. Sequencing discipline
   - do not begin the earnings slice, backend bridge slice, or runtime bridge
     slice until the current publish slice is implemented, tested, validated,
     and documented

## Execution Order For Current Slice

1. add the missing InsForge schema and service methods for notifications, tax
   profiles, and distribution records
2. migrate `/api/publish/submit`, `/api/publish/status`, and
   `/api/webhooks/publishdrive` to the new service layer
3. migrate `NotificationBell.jsx`, `DistributionManager.jsx`,
   `TaxInformationStep.jsx`, and `DistributionStatusPanel.tsx` to authenticated
   route fetches
4. add focused route and component tests
5. run type-check and focused regression validation
6. update delivery artifacts and re-rank the next ready slice

## Completion Summary

This slice is complete.

Delivered:

- InsForge schema for author tax profiles, distribution records, distribution
  channels, and publish notifications
- InsForge publishing service and authenticated publish-side routes
- UI cutover for notifications, tax information, distribution manager, and the
  residual `DistributionStatusPanel.tsx`
- focused route and component tests
- staging migration apply on the linked `staging-chat-auth` backend

Validation:

- `pnpm vitest run app/api/books/notifications/route.test.ts app/api/publish/tax/route.test.ts app/api/publish/status/route.test.ts app/api/publish/submit/route.test.ts components/tools/writing-studio/workspace/publish/NotificationBell.test.jsx components/tools/writing-studio/workspace/publish/TaxInformationStep.test.jsx`
- `pnpm exec tsc --noEmit`
- `npx @insforge/cli db migrations up --all`

Next ranked task:

- `hooks/useEarnings.js`
- `components/tools/writing-studio/workspace/publish/EarningsDashboard.jsx`
- `components/tools/writing-studio/workspace/publish/PayoutManager.jsx`
