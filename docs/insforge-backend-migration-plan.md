# InsForge Backend Migration Plan

## Purpose

Define the full backend migration path from the current Convex-backed legacy
implementation to an InsForge-centered backend model.

This document is intended to answer three operational questions:

1. what backend logic still lives in Convex today
2. what each legacy module should become on InsForge
3. what the first non-chat migration should be after the auth/chat foundation

## Current State Summary

- InsForge is already the active foundation for:
  - authentication and session handling
  - server-side user resolution
  - Postgres-backed chat persistence
- Convex still holds most non-chat business logic, including:
  - Books and publishing
  - projects and writing persistence
  - Twin and Second Me
  - community/forums/channels
  - credits, subscriptions, marketplace, earnings, payouts
  - notifications and audit history
- The repo still contains the full legacy source code, so backend behavior has
  not been lost even if Convex access is no longer recoverable.

## Current Execution Status

As of `2026-07-17`, the first non-chat migration slice has been executed:

- Books Phase 1 schema and RLS have been applied to the linked staging InsForge
  project through `migrations/20260717061456_books-phase1-core.sql`
- the `book-manuscripts` and `book-covers` storage buckets now exist with the
  expected private/public boundary for Phase 1
- the creator draft, marketplace, purchase, library, sales, and admin
  moderation launch surfaces now use InsForge-backed services and routes
- external distribution and other non-Phase-1 legacy modules remain future
  migration work and do not block the Phase 1 internal marketplace launch slice

## Migration Principles

1. keep InsForge as the long-term system of record for auth, ownership, storage,
   and durable application data
2. treat Convex source files as the behavioral source of truth during migration
3. do not add new long-lived Convex dependencies
4. migrate by backend slice, not by random file order
5. preserve user-visible behavior before optimizing schema design
6. prefer deploy-first, migration-second rollouts when old production code still
   depends on the legacy schema

## Existing InsForge Foundation

The following components are already reusable for the remaining migrations:

- auth/session helpers:
  - `lib/insforge/client.ts`
  - `lib/insforge/server.ts`
  - `lib/insforge/user.ts`
- shared user bridge:
  - `lib/server-auth.ts`
- database access layer:
  - `lib/insforge-db.ts`
- deployed auth routes:
  - `/api/auth/sign-in`
  - `/api/auth/sign-up`
  - `/api/auth/sign-out`
  - `/api/auth/refresh`
- established InsForge/Postgres migration pattern:
  - `migrations/20260713104922_chat-history-base.sql`
  - `migrations/20260714014616_adopt-native-chat-auth-ownership.sql`
  - `migrations/20260715011500_chat-auth-owner-fk-hardening.sql`
  - `migrations/20260715013000_chat-legacy-owner-nullable.sql`
- proven service pattern:
  - `lib/chat/server.ts`

These should be treated as templates for the next backend slices.

## Deliverable 1: Migration Inventory

### A. Module Inventory And Target Mapping

The table below maps every current Convex module to the planned InsForge target.
Target categories are:

- `DB`: InsForge Postgres tables and RLS
- `API`: Next.js route handlers or RPC-style application endpoints
- `Service`: server-side domain service or background worker

| Convex module | Core functionality | Current Convex tables / dependencies | Target InsForge category | Planned InsForge target |
| --- | --- | --- | --- | --- |
| `auth.config.ts` | Convex auth provider configuration | Convex auth runtime | API / Service | Remove after cutover; native InsForge auth remains canonical |
| `http.ts` | Convex HTTP auth helpers and JWKS exposure | Convex auth runtime | API | Replace with InsForge-native auth/JWKS usage already present in app auth and preview access |
| `lib/auth.ts` | Admin gating helpers | `admins`, identity subject | Service | `lib/authz/admin.ts` backed by InsForge roles table or admin allowlist config |
| `users.ts` | Convex user profile helpers | `users` | DB / API / Service | `public.user_profiles`, `/api/profile`, `lib/users/insforge-user-service.ts` |
| `projects.ts` | Project CRUD and version-aware writing project state | `projects`, `projectVersions`, `versions`, `chapters` | DB / API / Service | `public.projects`, `public.project_versions`, `/api/projects`, `lib/projects/insforge-project-service.ts` |
| `writing.ts` | Writing autosave, sections, characters, progress | `writingAutosaves`, `projects`, `chapters` | DB / API / Service | `public.writing_autosaves`, `public.project_documents`, `/api/writing/*`, `lib/writing/insforge-writing-service.ts` |
| `conversations.ts` | Conversation lifecycle, search, list, sync | `conversations`, `conversationSessions` | DB / API / Service | Already migrated to `public.chat_conversations`, `/api/chat/conversations`, `lib/chat/server.ts` |
| `messages.ts` | Message append, stream persistence, deletion | `messages`, `conversations` | DB / API / Service | Already migrated to `public.chat_messages`, `/api/chat`, `lib/chat/server.ts` |
| `books.ts` | Creator draft CRUD, uploads, submission, publish metadata | `books`, Convex storage, `projects` | DB / API / Service | `public.books`, `public.book_assets`, `public.book_moderation_events`, `/api/books/drafts*`, `lib/books/insforge-book-draft-service.ts` |
| `bookService.ts` | Engine-side book runtime, chapter persistence, chapter attempts | `books`, `chapters`, `chapterAttempts` | DB / API / Service | `public.books`, `public.book_chapters`, `public.book_chapter_attempts`, existing `/api/book`, `lib/book/insforge-book-service.ts` |
| `admin.ts` | Admin review queues, moderation actions, admin bootstrap | `admins`, `books`, `forums`, `twins` | DB / API / Service | `public.admin_roles`, `public.book_moderation_events`, `/api/admin/*`, `lib/admin/insforge-admin-service.ts` |
| `publishing.ts` | Distribution workflow, sales, publishing state | `distributions`, `distributionRecords`, `salesRecords`, `authorTaxInfo` | DB / API / Service | `public.book_distribution_targets`, `public.book_distribution_runs`, `public.book_sales_records`, `public.author_tax_profiles`, `lib/publishing/insforge-publishing-service.ts` |
| `isbn.ts` | ISBN allocation and assignment | `isbnPool`, `books` | DB / Service | `public.book_isbn_pool`, `lib/publishing/insforge-isbn-service.ts` |
| `latex.ts` | LaTeX build tracking | `latexBuilds` | DB / Service | `public.book_render_jobs`, `lib/publishing/insforge-render-service.ts` |
| `twin.ts` | Twin profile, lifecycle, tasks, follows, notifications, knowledge | `twins`, `twin_tasks`, `twin_knowledge`, `twin_follows`, `twin_notifications`, `twin_activity_log`, `twin_transfer_requests`, `twin_pending_approvals` | DB / API / Service | `public.twins`, `public.twin_tasks`, `public.twin_knowledge`, `public.twin_follows`, `public.twin_notifications`, `public.twin_activity_log`, `public.twin_transfer_requests`, `/api/twins/*`, `lib/twin/insforge-twin-service.ts` |
| `twin_lifecycle_transitions.ts` | Twin state machine transitions | `twins`, `twin_activity_log` | Service | `lib/twin/twin-lifecycle-service.ts` with DB-backed transition log |
| `secondMePersistence.ts` | BYOK custody and writing profile persistence | `secondMeKeyCustody`, `writingProfiles` | DB / API / Service | `public.second_me_key_custody`, `public.writing_profiles`, `/api/second-me/*`, `lib/second-me/insforge-second-me-service.ts` |
| `secondMe.ts` | Deprecated compatibility surface | legacy `second_me*` tables | Service | Remove after data archival; do not migrate as active feature surface |
| `agents.ts` | Deprecated compatibility surface | legacy `agents` tables | Service | Remove after data archival; do not migrate as active feature surface |
| `forums.ts` | Forum CRUD, posts, reactions, reservations, tips, chat | `forums`, `forum_posts`, `forum_reactions`, `forum_reservations`, `forum_tips`, `forum_chat` | DB / API / Service | `public.forums`, `public.forum_posts`, `public.forum_reactions`, `public.forum_reservations`, `public.forum_tips`, `public.forum_chat_messages`, `/api/forums/*`, `lib/community/insforge-forum-service.ts` |
| `channels.ts` | Channel CRUD and membership | `channels`, `channelMemberships` | DB / API / Service | `public.channels`, `public.channel_memberships`, `/api/channels/*`, `lib/community/insforge-channel-service.ts` |
| `votes.ts` | Voting state and tallying | `votes` | DB / Service | `public.votes`, `lib/community/insforge-vote-service.ts` |
| `reputation.ts` | User reputation changes | `userReputation` | DB / Service | `public.user_reputation`, `lib/community/insforge-reputation-service.ts` |
| `reviewerFund.ts` | Reviewer fund pool and distributions | `reviewerFundPool`, `reviewerFundDistributions`, purchases/credits dependencies | DB / Service | `public.reviewer_fund_pool`, `public.reviewer_fund_distributions`, `lib/community/insforge-reviewer-fund-service.ts` |
| `billing.ts` | Billing summaries and subscription coordination | `userSubscriptions`, `subscriptionPlans`, `subscriptionUsage`, `webhookEvents` | API / Service | `/api/billing/*`, `lib/billing/insforge-billing-service.ts` |
| `subscriptions.ts` | Plan sync, subscription lifecycle, usage tracking | `subscriptionPlans`, `userSubscriptions`, `subscriptionUsage`, `webhookEvents` | DB / API / Service | `public.subscription_plans`, `public.user_subscriptions`, `public.subscription_usage`, `public.billing_webhook_events`, `lib/billing/insforge-subscription-service.ts` |
| `credits.ts` | Credits wallet and transactions | `userCredits`, `creditTransactions`, `usageMetrics` | DB / API / Service | `public.user_credits`, `public.credit_transactions`, `public.usage_metrics`, `/api/credits/*`, `lib/billing/insforge-credit-service.ts` |
| `marketplace.ts` | Paid content purchase, listings, star gifts | `contentPurchases`, `starBalances`, `starTransactions`, `starGifts` | DB / API / Service | `public.content_purchases`, `public.star_balances`, `public.star_transactions`, `public.star_gifts`, `/api/marketplace/*`, `lib/marketplace/insforge-marketplace-service.ts` |
| `earnings.ts` | Creator earnings summaries | `earningsRecords` | DB / API / Service | `public.creator_earnings_records`, `/api/earnings/*`, `lib/payouts/insforge-earnings-service.ts` |
| `payouts.ts` | Payout accounts and transfers | `payouts`, `payoutAccounts` | DB / API / Service | `public.payouts`, `public.payout_accounts`, `/api/payouts/*`, `lib/payouts/insforge-payout-service.ts` |
| `notifications.ts` | User notifications | `notifications`, `public_notifications` | DB / API / Service | `public.notifications`, `/api/notifications`, `lib/notifications/insforge-notification-service.ts` |
| `agent_notifications.ts` | Agent/twin notification feed | `agent_notifications`, `twins` | DB / Service | `public.twin_notifications` or `public.agent_notifications_legacy` during cutover, `lib/notifications/insforge-twin-notification-service.ts` |
| `auditEvents.ts` | Append-only audit chain | `auditEvents` | DB / Service | `public.audit_events`, `lib/audit/insforge-audit-service.ts` |
| `llmUsage.ts` | Model cost and usage tracking | `llmUsage` | DB / Service | `public.llm_usage`, `lib/llm/insforge-usage-service.ts` |

### B. Field-Level Schema Alignment

The tables below define the exact field alignment rules needed for migration.
These are the minimum canonical mappings required to port the current backend
semantics into InsForge/Postgres.

#### 1. Identity And Ownership Alignment

| Convex pattern | InsForge target | Transformation |
| --- | --- | --- |
| `userId: string` using auth subject | `auth_user_id uuid references auth.users(id)` | Resolve Convex/legacy subject to InsForge `auth.users.id`; preserve original subject in `legacy_user_id text` during transition |
| mixed `Id<"users">` and string user ids | `auth_user_id uuid` only | Normalize all business tables to one owner key; keep temporary `legacy_user_ref text` only where backfill is incomplete |
| `admins.email` or config-gated admins | `public.admin_roles(auth_user_id, role, granted_by, granted_at)` | Map known admin emails to InsForge users and persist explicit roles |

#### 2. Books And Publishing Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `books._id` | `books.id uuid` | New UUID primary key; keep `legacy_convex_id text unique` for backfill traceability |
| `books.userId` | `books.auth_user_id uuid` | Canonical owner |
| `books.projectId` | `books.source_project_id uuid nullable` + `books.legacy_project_id text nullable` | Do not block Books migration on Projects migration |
| `books.title`, `subtitle`, `description` | same semantic fields on `books` | Direct copy |
| `books.status` | `books.status` | Preserve lifecycle: `draft`, `submitted`, `approved`, `published`, `rejected`, `unpublished` |
| `books.engineStatus` | `books.engine_status` | Keep separate from publish lifecycle |
| `books.listPrice` + `currency` | `books.price_display numeric(12,2)` + `books.currency_code text` + optional `books.price_credits integer` | Normalize string money; maintain credits compatibility for internal marketplace flow |
| `books.keywords`, `category`, `subcategory`, `language` | same semantic fields on `books` | Use `text[]` for keywords |
| `books.manuscriptStorageId`, `coverStorageId` | `book_assets(book_id, asset_kind, storage_key, url, mime_type, byte_size, metadata)` | Split assets into dedicated rows |
| `books.manuscriptName`, `manuscriptSize`, `manuscriptFormat`, `coverDimensions` | `book_assets.metadata jsonb` and explicit `byte_size`, `mime_type` | Normalize file metadata out of `books` row |
| `books.timestamps.*` | `books.created_at`, `submitted_at`, `published_at`, `rejected_at`, plus `book_moderation_events.created_at` | Decompose status timestamp map into typed columns and audit events |
| `books.completedSteps`, `currentStep`, agreement fields | same semantic fields on `books` | Retain as onboarding/draft progression fields for Phase 1 |

#### 3. Book Engine Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `chapters.bookId` | `book_chapters.book_id uuid` | FK to `books.id` |
| `chapters.index` | `book_chapters.chapter_index integer` | Direct copy |
| `chapters.intent`, `content`, `status`, `attempts` | same semantic fields on `book_chapters` | Direct copy |
| `chapterAttempts.bookId`, `index`, `attempt`, `status`, `gateIssues`, `tokensUsed`, `modelHandle` | `book_chapter_attempts` columns + `gate_issues jsonb` | Normalize attempt history |

#### 4. Projects And Writing Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `projects._id` | `projects.id uuid` | New UUID primary key with legacy id trace |
| `projects.userId` | `projects.auth_user_id uuid` | Canonical owner |
| `projectVersions` and `versions` rows | `project_versions` | Collapse duplicate version concepts into one relational table if possible |
| `writingAutosaves.content`, section blobs, character blobs | `writing_autosaves.snapshot jsonb` or normalized `project_documents` rows | Preserve raw JSON first; normalize later |
| dual-purpose `chapters` rows | `project_chapters` and `book_chapters` split | Remove overloaded chapter semantics |

#### 5. Twin And Second Me Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `twins.userId` | `twins.auth_user_id uuid` | Canonical owner |
| `twins` lifecycle fields | same semantic columns on `twins` | Preserve verification, transfer, and approval states |
| `twin_tasks`, `twin_knowledge`, `twin_notifications` | same semantic relational tables | Direct migration with owner normalization |
| `secondMeKeyCustody` without `twinId` | `second_me_key_custody(auth_user_id, provider, encrypted_secret, scope)` | Preserve separation from twin identity |
| `writingProfiles` | `writing_profiles` | Direct copy with owner normalization |

#### 6. Community Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `forums.ownerTwinId` or `agentId` | `forums.owner_twin_id uuid nullable` + `legacy_agent_id text nullable` | Preserve historical ownership during legacy cleanup |
| `forum_posts`, `forum_reactions`, `forum_chat` | same semantic relational tables | Direct copy with explicit FKs |
| `channels`, `channelMemberships` | same semantic relational tables | Direct copy |
| `votes.targetType`, `targetId` | `votes.target_type`, `votes.target_id` | Keep polymorphic voting target design initially |
| `userReputation.points`, event fields | `user_reputation` | Direct copy |

#### 7. Commerce And Billing Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `userCredits.balance` | `user_credits.balance` | Canonical wallet |
| `creditTransactions.amount`, `reason`, refs | `credit_transactions` | Direct copy; make debit/credit direction explicit |
| `subscriptionPlans`, `userSubscriptions`, `subscriptionUsage` | same semantic relational tables | Direct copy with normalized owner ids |
| `webhookEvents` | `billing_webhook_events` | Keep idempotency key and provider event id unique |
| `contentPurchases` | `content_purchases` | Direct copy with explicit asset/book/twin target references |
| `starBalances`, `starTransactions`, `starGifts` | same semantic relational tables | Direct copy |
| `earningsRecords`, `payouts`, `payoutAccounts` | same semantic relational tables | Direct copy with FK cleanup |

#### 8. Notifications, Audit, And Usage Alignment

| Convex source field | InsForge target field | Notes / transformation |
| --- | --- | --- |
| `notifications` and `public_notifications` | `notifications` with `visibility_scope` enum | Consolidate duplicate tables |
| `agent_notifications` | `twin_notifications` | Merge legacy naming into current twin model |
| `auditEvents.hash`, `prevHash`, payload | `audit_events(hash, prev_hash, payload jsonb)` | Preserve append-only order and chain integrity |
| `llmUsage` | `llm_usage` | Direct copy with provider/model columns normalized |

### C. Required Data Transformations

These transformations apply across the migration inventory:

1. **owner normalization**
   - convert all Convex `userId` values into InsForge `auth.users.id`
   - keep `legacy_user_id` columns until all consumers are cut over

2. **legacy id traceability**
   - preserve original Convex `_id` values in `legacy_convex_id text unique`
   - use mapping tables when a single Convex row fans out into multiple
     relational rows

3. **JSON decomposition**
   - move overloaded JSON blobs into dedicated `jsonb` columns first
   - normalize into relational child tables only when required by the next slice

4. **storage migration**
   - move Convex `_storage` references into InsForge storage metadata:
     `bucket`, `key`, `url`, `mime_type`, `byte_size`, `checksum`
   - preserve original storage ids as legacy metadata when backfill data exists

5. **timestamp decomposition**
   - split embedded timestamp maps into typed columns and event history rows

6. **status machine preservation**
   - preserve existing enums and transition guards before attempting any product
     redesign

7. **duplicate concept consolidation**
   - merge duplicates such as:
     - `notifications` and `public_notifications`
     - `distributions` and `distributionRecords`
     - `agents` and `twins` legacy ownership references

### D. Sequencing Dependencies

The migration order must account for the following module dependencies:

1. **auth and owner normalization** is foundational for every remaining slice
2. **Books Phase 1 schema and RLS** should land before creator workflow,
   marketplace, and purchase/library work
3. **credits wallet normalization** must exist before book purchase flows move
   to InsForge
4. **admin role persistence** should exist before moderation workflows are
   cut over
5. **projects migration** should not block Books migration; use nullable legacy
   project references in the interim
6. **Twin migration** should precede any full forum ownership cleanup because
   forum ownership still references Twin/agent concepts
7. **billing webhooks and subscription state** should stabilize before final
   commerce and payout migration
8. **audit event migration** should happen before destructive Convex cleanup so
   cutover actions remain traceable

## Deliverable 2: Priority Assessment And Sequencing

### Assessment Criteria

Each remaining backend slice is scored on:

- business criticality
- dependency centrality
- migration complexity
- cutover risk
- effort estimate

Score meaning:

- `5`: highest
- `1`: lowest

### Priority Matrix

| Backend slice | Business criticality | Dependency centrality | Complexity | Risk | Effort | Recommended order | Rationale |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Books Phase 1 data model and ownership | 5 | 5 | 3 | 3 | 3 | 1 | Next explicit delivery target, high user impact, bounded scope, enables creator and marketplace flows |
| Books creator draft workflow | 5 | 4 | 3 | 3 | 3 | 2 | Directly unlocks creator-side product value after schema foundation exists |
| Books marketplace and detail | 5 | 4 | 3 | 3 | 3 | 3 | Depends on published catalog model and ownership flags |
| Purchase and library ownership | 5 | 5 | 4 | 4 | 4 | 4 | High-value revenue path but depends on books schema and credits wallet correctness |
| Moderation and admin controls | 4 | 4 | 3 | 3 | 2 | 5 | Depends on book schema and admin roles; lower end-user urgency than creator/purchase flow |
| Projects and writing persistence | 4 | 3 | 4 | 4 | 4 | 6 | Important authoring foundation, but can be partially decoupled from Books via legacy project refs |
| Credits and subscriptions normalization | 5 | 4 | 4 | 4 | 4 | 7 | Revenue-critical, but riskier and best tackled after the first bounded non-chat migration succeeds |
| Twin core profile and Second Me persistence | 4 | 4 | 5 | 5 | 5 | 8 | Densest identity-sensitive slice with BYOK and lifecycle semantics |
| Forums, channels, votes, reputation | 4 | 3 | 4 | 4 | 4 | 9 | Depends on Twin ownership cleanup and identity normalization |
| Earnings, payouts, publishing distribution | 3 | 3 | 4 | 4 | 4 | 10 | Important operationally, but later than creator-facing internal marketplace scope |
| Notifications and audit consolidation | 3 | 4 | 3 | 3 | 2 | 11 | Best handled after core business tables stabilize |
| LLM usage and reviewer fund cleanup | 2 | 2 | 3 | 3 | 2 | 12 | Valuable, but not on the critical path to restore the product backend |

### Prioritized Roadmap

1. complete production auth/chat rollout and lock owner normalization patterns
2. migrate Books Phase 1 data model and ownership
3. migrate Books creator draft workflow
4. migrate marketplace and book detail persistence
5. migrate purchase and library ownership on top of the credits wallet
6. migrate moderation and admin controls
7. migrate projects and writing persistence
8. normalize credits, subscriptions, and commerce internals
9. migrate Twin and Second Me persistence
10. migrate forums, channels, votes, and reputation
11. migrate earnings, payouts, ISBN, LaTeX, and distribution workflows
12. consolidate notifications, audit, and usage tracking
13. remove residual Convex compatibility bridges and dead modules

### Why Books Is First

Books is the best first non-chat migration because:

- it is already the next explicitly approved backend program in project docs
- it is high-value and user-facing
- it is large enough to prove the migration pattern but smaller than Twin or
  billing
- it can use the existing InsForge auth and Postgres patterns immediately
- it can tolerate temporary links to unmigrated Projects through legacy ids

## Deliverable 3: First Non-Chat InsForge Migration

### First Migration Scope

**Primary Convex module**

- `convex/books.ts`

**Supporting dependency modules**

- `convex/admin.ts` for moderation state read/write follow-up
- `convex/schema.ts` for existing book field semantics
- existing route surface:
  - `app/api/book/route.ts` is a related existing book API but represents the
    engine path, not the full Phase 1 publishing flow

**Target InsForge implementation**

- DB:
  - `public.books`
  - `public.book_assets`
  - `public.book_moderation_events`
  - optional transitional `public.book_migration_map`
- API:
  - `POST /api/books/drafts`
  - `GET /api/books/drafts`
  - `PATCH /api/books/drafts/[bookId]`
  - `POST /api/books/drafts/[bookId]/submit`
  - `POST /api/books/uploads`
- Service:
  - `lib/books/insforge-book-draft-service.ts`
  - `lib/books/insforge-book-upload-service.ts`

### Scope Boundaries

**In scope**

- creator draft creation
- creator draft update
- manuscript and cover metadata persistence
- submit-for-review transition
- ownership and moderation-ready schema
- RLS and admin visibility rules

**Out of scope**

- purchase flow
- library access
- marketplace browse
- external distribution
- payout automation

### Phase-By-Phase Implementation Plan

#### Phase 0: Readiness And Design

1. confirm Books Phase 1 status lifecycle and required fields
2. freeze the first migration scope to `convex/books.ts` draft lifecycle only
3. document the Convex-to-InsForge field map for:
   - draft metadata
   - asset metadata
   - moderation event history
4. prepare owner-id mapping strategy:
   - InsForge `auth_user_id`
   - temporary `legacy_user_id`
5. define the rollout gate:
   - application code deployed first
   - DB migration executed only after route and service compatibility are ready

#### Phase 1: Schema Creation

1. add SQL migration for `public.books`
   - UUID PK
   - `auth_user_id`
   - `legacy_convex_id`
   - draft/publish lifecycle fields
   - metadata fields required by Phase 1
2. add SQL migration for `public.book_assets`
   - `book_id`
   - `asset_kind`
   - storage key/url
   - file metadata
3. add SQL migration for `public.book_moderation_events`
   - `book_id`
   - `event_type`
   - `actor_auth_user_id`
   - `reason`
   - `created_at`
4. add triggers and indexes
   - owner/status lookup indexes
   - updated-at triggers
5. add RLS policies
   - creators can read/write their own draft records
   - only admins can see full moderation history across users
   - public browse remains disabled until marketplace slice lands

#### Phase 2: Business Logic Port

1. create `lib/books/insforge-book-draft-service.ts`
2. port logic from `convex/books.ts`:
   - `createDraft`
   - `updateDraft`
   - `saveManuscriptFile`
   - `saveCoverFile`
   - `submitForReview`
3. preserve the same guard rules:
   - auth required
   - owner required
   - only `draft` and `rejected` can be edited
   - submission requires the minimum required metadata
4. port upload-url logic to InsForge storage integration
5. store storage metadata in `book_assets` instead of embedding storage ids on
   the `books` row

#### Phase 3: API Integration

1. add route handlers under `/api/books/drafts*`
2. authenticate via `getAuthenticatedUser()` with InsForge-first resolution
3. return stable JSON contracts for:
   - create/list drafts
   - patch draft
   - submit draft
   - upload URL generation
4. add compatibility adapter where necessary so existing UI can be migrated
   incrementally without a flag day

#### Phase 4: Data Migration

1. export existing Convex `books` rows if data access is available
2. build backfill script:
   - read Convex `books`
   - resolve `userId` to `auth_user_id`
   - insert `books`
   - fan out manuscript/cover data into `book_assets`
   - convert `timestamps` map into explicit columns and moderation events
3. if Convex data export is not recoverable:
   - proceed with logic migration first
   - mark this slice as functionality rebuild plus optional legacy-data recovery
   - keep `legacy_convex_id` nullable
4. verify row counts and owner mappings

#### Phase 5: Integration Testing And Cutover

1. run unit tests for validation and state transitions
2. run integration tests against InsForge/Postgres and storage
3. run end-to-end creator draft flows
4. deploy app code with new routes and service
5. apply database migration
6. execute verification checklist
7. retire the corresponding Convex-backed creator draft calls only after the new
   path passes verification

### Success Criteria

The first migration is successful when:

1. creators can create, update, and list draft books through InsForge-backed
   APIs
2. manuscript and cover uploads persist metadata in InsForge-backed storage
3. submit-for-review enforces the same guard rules as the current Convex flow
4. RLS prevents unauthorized access to other creators' drafts
5. draft operations complete within acceptable application latency:
   - create/list/patch under normal interactive thresholds
   - no duplicate draft creation on retries
6. all unit, integration, and e2e validations pass

### Risk Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Convex data export unavailable | Historic draft records cannot be backfilled immediately | Separate logic migration from data recovery; preserve nullable legacy ids and document rebuild-only mode |
| user identity mismatch between legacy subject and InsForge user | Ownership corruption | Build explicit subject-to-auth-user mapping and validate sample records before bulk backfill |
| overloaded `books` schema mixes creator and engine semantics | Incorrect state transitions | Keep `status` and `engine_status` separate from day one |
| storage migration drift | Broken manuscript/cover references | Move asset metadata to `book_assets` and verify URLs/checksums during backfill |
| UI expects old payload shapes | Frontend regressions | Add compatibility response contract or mapper at API boundary |
| admin moderation not ready on day one | Review queue blocked | Persist `book_moderation_events` in Phase 1 even if full admin UI lands later |

### Documentation Requirements

Capture the following during the first migration:

1. final SQL schema and RLS decisions
2. owner-mapping rules and any exceptions
3. payload compatibility notes between old and new APIs
4. data backfill steps and verification outputs
5. rollback procedure
6. lessons learned that change the approach for:
   - Projects
   - credits/commerce
   - Twin/community

### Test Plan

#### Unit Tests

- draft payload validation
- editability guard for `draft` and `rejected` only
- submit-for-review validation
- owner guard helper behavior
- file metadata normalization

#### Integration Tests

- create draft writes `books` row with InsForge owner
- patch draft updates only permitted fields
- upload flow writes `book_assets`
- submit-for-review writes status transition and moderation event
- RLS blocks cross-user reads and updates

#### End-To-End Tests

- creator signs in with InsForge auth and creates a draft
- creator uploads manuscript and cover
- creator submits draft for review
- admin reads moderation-ready record

#### Operational Verification

- migration row counts match expectations
- sampled legacy records resolve to the correct InsForge owners
- no unauthorized draft reads are possible
- logs show no fallback calls to legacy Convex draft endpoints after cutover

## Recommended Immediate Actions

1. approve this document as the backend migration source of truth
2. create the missing migration matrix issues by slice:
   - Books schema/RLS
   - Books draft workflow
   - marketplace and purchase/library
   - projects/writing
   - Twin
   - forums/community
   - billing/credits/subscriptions
3. execute the first non-chat migration as:
   - Books Phase 1 Slice 1: data model and ownership
   - anchored on `convex/books.ts`
4. keep the existing chat migration patterns as the template for:
   - owner normalization
   - RLS
   - deploy sequencing
   - verification
