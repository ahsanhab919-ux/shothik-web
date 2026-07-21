# Shothik Books Phase 1 MVP Specification

## 1. Document Control

- Product: `Shothik Books`
- Phase: `Phase 1 MVP`
- Status: `Draft for execution`
- Primary audience:
  - Product
  - Engineering
  - Design
  - QA
  - Operations
- Scope principle: `Launch Shothik's own book marketplace, purchase flow, and reader library before external store distribution`

## 2. Executive Summary

Phase 1 MVP establishes `Shothik Books` as an internal creator-to-reader
platform where authors can prepare and publish books inside Shothik, readers can
discover and purchase those books using the existing credit economy, and both
authors and platform admins can manage the resulting lifecycle.

This phase does **not** include external distribution to Google Play Books,
Amazon Kindle, or other channels. Those integrations belong to later phases
after Shothik proves its internal catalog, commerce, moderation, and ownership
flows.

## 3. Core Business Objectives

### 3.1 Primary objectives

1. Launch an internal digital book marketplace on Shothik.
2. Enable creators to publish books for sale within Shothik.
3. Enable readers to browse, purchase, and access owned books in a personal
   library.
4. Validate the asset-centric business model:
   - create
   - publish
   - discover
   - purchase
   - consume
   - earn
5. Reuse and strengthen existing credits, marketplace, and community surfaces.

### 3.2 Secondary objectives

1. Create a stable backend/data model that can later support:
   - external distribution
   - royalties and payout automation
   - creator analytics
   - community-driven discovery
2. Move the book commerce surface toward the InsForge-first target architecture.

### 3.3 Non-objectives for Phase 1

The following are explicitly out of scope:

- direct publishing to Google Play Books
- PublishDrive-based external distribution
- audiobook publishing
- print-on-demand workflows
- advanced social reading features
- creator payout disbursement automation
- multilingual storefront localization beyond existing app defaults
- full reader recommendation engine
- subscription reading plans

## 4. Core Value Proposition

`Shothik Books` helps creators turn writing assets into sellable digital books
inside the Shothik ecosystem, while helping readers discover and unlock those
books through a simple, trusted marketplace and library experience.

Value for creators:

- publish within an existing audience ecosystem
- reuse writing and agent-assisted assets
- monetize books with low operational friction
- prepare for future multi-channel distribution

Value for readers:

- discover books inside Shothik
- buy with credits using a familiar flow
- keep owned books in a library
- access book pages, metadata, and previews in one place

## 5. MVP Scope

### 5.1 Must-have scope

1. Creator book publishing workflow inside Shothik
2. Internal marketplace listing and book detail pages
3. Credit-based purchase flow
4. Reader library ownership and access
5. Admin moderation and publish/unpublish controls
6. Basic creator earnings reporting inside the platform
7. Auditability, ownership enforcement, and event/status visibility

### 5.2 Nice-to-have but excluded from Phase 1

1. Community preview before publishing
2. Public ratings and reviews
3. personalized recommendations
4. advanced reader experience with bookmarks/highlights
5. author storefront profiles
6. external metadata enrichment from Google Books

## 6. Target Users

### 6.1 Primary user segments

- `Author / Creator`
  - writes and publishes books for sale
- `Reader / Buyer`
  - discovers books and purchases them with credits
- `Platform Admin / Moderator`
  - reviews books, manages policy, handles takedowns, and oversees catalog

### 6.2 Secondary user segments

- `Agent-assisted creator`
  - uses Twin/Hermes or writing workflows to produce books
- `Support / operations`
  - investigates purchases, ownership issues, and content disputes

## 7. Functional Requirements

### 7.1 Creator publishing workflow

#### FR-CP-1 Book draft creation

The system must allow an authenticated creator to create a book draft with at
least:

- title
- subtitle (optional)
- description
- category
- language
- cover asset
- manuscript asset
- credit price

#### FR-CP-2 Draft save and resume

The system must persist draft state so a creator can leave and return without
losing progress.

#### FR-CP-3 Validation before submission

The system must validate that a book cannot be submitted for publishing unless
required fields are complete and valid.

Minimum validation:

- title present and at least 3 characters
- description present and at least 50 characters
- category present
- manuscript present
- cover present
- credit price is a non-negative integer

#### FR-CP-4 Review submission

The system must allow a creator to submit a book for review, changing status
from `draft` to `submitted`.

#### FR-CP-5 Publish state management

The system must support at least these states:

- `draft`
- `submitted`
- `approved`
- `published`
- `rejected`
- `unpublished`

#### FR-CP-6 Creator visibility

The system must show creators the current status of each book and the reason
for rejection or unpublish if applicable.

### 7.2 Marketplace and discovery

#### FR-MD-1 Marketplace browse

The system must provide a marketplace page showing published books only.

Each listing must include:

- title
- cover image
- author name
- short description or excerpt
- credit price

#### FR-MD-2 Book detail page

The system must provide a book detail page for each published book.

The page must show:

- metadata
- cover
- description
- creator name
- price
- ownership state
- buy action when not owned
- read/access action when owned

#### FR-MD-3 Search and basic filtering

The marketplace must support at least:

- search by title
- filter by category

### 7.3 Purchase and ownership

#### FR-PO-1 Credit purchase flow

The system must allow an authenticated user with sufficient credits to purchase
a published book.

#### FR-PO-2 Ownership enforcement

After purchase, the system must create an ownership record linking the book to
the buyer and prevent duplicate purchases of the same book by the same user.

#### FR-PO-3 Balance deduction

The system must deduct the correct credit amount exactly once per successful
purchase.

#### FR-PO-4 Purchase confirmation

The system must show a clear purchase success state and reflect ownership
immediately in the UI.

#### FR-PO-5 Insufficient balance handling

The system must block purchase when the user lacks credits and direct the user
to the existing top-up flow.

### 7.4 Reader library and access

#### FR-RL-1 My Library

The system must provide a `My Library` view listing books owned by the current
user.

#### FR-RL-2 Owned-book access

The system must allow a user to open a purchased book from the library or book
detail page.

#### FR-RL-3 Access control

The system must prevent access to paid book content for users who do not own
the book, unless a preview is explicitly enabled.

#### FR-RL-4 Basic reading surface

The system must provide a basic reading experience sufficient for MVP:

- open book content
- load book title and chapter/section content
- preserve readable formatting at an acceptable level

Advanced annotations are out of scope.

### 7.5 Creator earnings and reporting

#### FR-ER-1 Sales summary

The system must show creators a summary of:

- books sold
- credits earned
- per-book sales count

#### FR-ER-2 Transaction history

The system must retain purchase records sufficient to audit sales and support
dispute investigation.

#### FR-ER-3 Revenue policy clarity

The product must clearly present the Phase 1 revenue model in creator-facing
copy and/or agreement flows.

### 7.6 Admin moderation and operations

#### FR-AM-1 Admin review queue

The system must provide an admin path to review submitted books before
publication.

#### FR-AM-2 Approve / reject

The system must allow admins to approve or reject submissions with a stored
reason.

#### FR-AM-3 Unpublish capability

The system must allow admins to unpublish a book after release.

#### FR-AM-4 Audit trail

The system must store enough event history to answer:

- who created the book
- who submitted it
- who approved/rejected it
- when it was purchased
- who owns it

## 8. Non-Functional Requirements

### 8.1 Security

1. All creator-specific and buyer-specific data access must be scoped to the
   authenticated user identity.
2. Purchase operations must be idempotent.
3. Credit deductions and ownership creation must be atomic from a business
   standpoint.
4. Admin moderation routes must be restricted to authorized staff roles.
5. Book access checks must prevent horizontal privilege escalation.

### 8.2 Reliability

1. Draft save and purchase flows must tolerate page refresh and retry without
   duplicating state.
2. Marketplace and library pages must degrade gracefully when optional services
   are unavailable.
3. Critical write actions must return clear error states.

### 8.3 Performance

1. Marketplace page should render initial visible content within `3 seconds`
   under normal production conditions.
2. Book detail page should render core metadata within `3 seconds`.
3. Purchase confirmation should complete within `5 seconds` under normal
   conditions.
4. My Library should load owned book summaries within `3 seconds`.

### 8.4 Maintainability

1. New Phase 1 work must favor InsForge-compatible data ownership patterns.
2. New permanent business logic must avoid introducing fresh long-lived Convex
   dependencies where migration alternatives are available.
3. All major flows must have automated test coverage.

### 8.5 Compliance and policy

1. The platform must require authors to affirm rights ownership before
   publication.
2. The platform must support removal of policy-violating content by admins.
3. Creator-facing revenue and ownership terms must be explicit in the UI.

## 9. User Stories

### 9.1 Creator stories

1. As a creator, I want to create a book draft so I can prepare it for sale.
2. As a creator, I want to upload a cover and manuscript so my book is
   complete.
3. As a creator, I want clear validation errors so I know what must be fixed
   before submission.
4. As a creator, I want to submit my book for review so it can be listed in the
   marketplace.
5. As a creator, I want to see whether my book is draft, submitted, approved,
   published, or rejected.
6. As a creator, I want to see what I have earned from book sales.

### 9.2 Reader stories

1. As a reader, I want to browse books in a marketplace so I can discover
   content.
2. As a reader, I want to search by title and filter by category so I can find
   relevant books faster.
3. As a reader, I want to purchase a book with credits so I can unlock it
   immediately.
4. As a reader, I want to see purchased books in My Library so I can return to
   them later.
5. As a reader, I want only the books I own to appear accessible in full.

### 9.3 Admin stories

1. As an admin, I want to review submitted books so I can moderate catalog
   quality.
2. As an admin, I want to approve or reject books with reasons so creators get
   actionable decisions.
3. As an admin, I want to unpublish a book if there is a policy or legal issue.
4. As support staff, I want to inspect purchase and ownership history so I can
   resolve disputes.

## 10. Acceptance Criteria

### 10.1 Creator publishing

1. Given an authenticated creator with a valid draft, when they submit it for
   review, then the book status changes to `submitted` and the action is stored.
2. Given a draft missing required fields, when the creator tries to submit,
   then submission is blocked and all blocking validation errors are shown.
3. Given an admin approves a submitted book, when publication occurs, then the
   book becomes visible in marketplace browse and search results.

### 10.2 Marketplace

1. Given a published book exists, when an anonymous or authenticated user opens
   the marketplace, then the book is visible with title, cover, author, and
   price.
2. Given a title search term, when the user searches, then matching published
   books are returned.
3. Given a category filter, when the user applies it, then only matching
   published books are shown.

### 10.3 Purchase and library

1. Given a reader with enough credits, when they purchase a published book,
   then credits are deducted once, ownership is created once, and the user sees
   success.
2. Given a reader who already owns a book, when they view the detail page, then
   the UI shows an owned/read state instead of a buy state.
3. Given a reader without enough credits, when they try to buy, then the system
   blocks the purchase and prompts a top-up path.
4. Given a purchased book, when the reader opens My Library, then that book is
   present and accessible.
5. Given a reader who does not own a paid book, when they request full content,
   then access is denied.

### 10.4 Admin moderation

1. Given a submitted book, when an admin rejects it with a reason, then the
   creator can see the rejection state and reason.
2. Given a published book, when an admin unpublishes it, then it is removed
   from marketplace browse while remaining auditable internally.

## 11. Technical Stack Specifications

### 11.1 Frontend

- Framework: `Next.js`
- Language: `TypeScript` preferred for new application code
- UI: existing React component architecture and design system

### 11.2 Backend and data

- Target system of record: `InsForge`
- Legacy compatibility reality: some existing book, marketplace, credits, and
  publishing flows remain Convex-backed and must be migrated incrementally
- Database: `InsForge Postgres`
- Auth: `InsForge auth helpers`
- Storage: `InsForge storage` for manuscript and cover assets where feasible

### 11.3 Payments and credits

- Phase 1 purchase unit: `credits`
- Existing payment rails for top-up can remain as supporting infrastructure
- Book purchase logic must be integrated with the existing credit wallet model

### 11.4 Infrastructure

- Hosting: `Vercel`
- DNS/TLS/WAF: `Cloudflare`
- Optional caching/rate limiting: `Upstash Redis`

### 11.5 Testing

- Unit/integration: `Vitest`
- E2E/smoke: `Playwright`
- Type safety gate: `tsc --noEmit`

## 12. Data and Domain Model Guidance

Phase 1 should normalize around these entities:

1. `users`
2. `books`
3. `book_assets`
4. `book_versions`
5. `book_status_events`
6. `book_purchases`
7. `book_ownership`
8. `creator_earnings_ledger`
9. `admin_review_actions`

Minimum book record fields:

- id
- auth_user_id owner
- title
- subtitle
- description
- category
- language
- status
- cover asset reference
- manuscript asset reference
- preview enabled flag
- credit price
- published_at
- created_at
- updated_at

## 13. Integration Constraints and Architecture Notes

1. Phase 1 must support the existing marketplace and credits experience already
   visible in the repo.
2. New work should not deepen the long-term dependency on Convex for permanent
   business logic.
3. If a temporary bridge is required to ship MVP safely, it must be documented
   with a migration follow-up.
4. External distribution code paths must remain out of Phase 1 launch criteria.

## 14. Development Timeline

Recommended execution window: `8 weeks`

### Week 1: Specification and schema alignment

- finalize product spec
- finalize data model
- confirm status model
- confirm revenue and moderation policy

### Week 2: Backend foundations

- book schema and ownership model
- draft creation and update APIs
- status transitions
- admin role checks

### Week 3: Creator workflow

- draft editor wiring
- asset upload flow
- validation and submission flow

### Week 4: Marketplace and detail pages

- marketplace browse
- search/filter
- book detail page

### Week 5: Purchase and library

- purchase transaction flow
- ownership creation
- My Library
- owned-book access control

### Week 6: Earnings and admin moderation

- creator sales summary
- admin review queue
- approve/reject/unpublish flows

### Week 7: Hardening and QA

- test coverage
- security review
- performance tuning
- staging verification

### Week 8: Launch prep

- release checklist
- operational runbook
- support playbook
- production launch review

## 15. Prioritization

### P0 Must ship

- creator draft and submission flow
- marketplace browse and detail page
- purchase with credits
- ownership enforcement
- My Library
- admin approve/reject/unpublish
- auditability

### P1 Strongly recommended

- creator earnings summary
- search and category filter
- basic preview support

### P2 Post-MVP

- community preview
- ratings/reviews
- external metadata import
- external distribution
- recommendation engine
- payout automation

## 16. Success Metrics

### 16.1 Launch readiness metrics

1. `0` P0 requirements open
2. all acceptance criteria validated
3. all critical purchase, ownership, and access tests passing
4. no known Sev-1 or Sev-2 security issues in Phase 1 scope

### 16.2 Product metrics for first 30 days

1. number of published books
2. number of creators who complete first publish
3. marketplace conversion rate from detail page to purchase
4. purchase success rate
5. owned-book access success rate
6. number of support incidents related to credits or ownership

### 16.3 MVP success thresholds

Suggested thresholds for Phase 1 validation:

- at least `25` published books
- purchase success rate `>= 98%`
- library access success rate `>= 99%`
- moderation turnaround median `< 48 hours`
- fewer than `2%` of purchases requiring manual support intervention

## 17. Risk Register and Mitigation Plan

### Risk 1: Credit deduction and ownership drift

- Impact: high
- Risk: a user is charged credits without ownership, or ownership is granted
  without charge
- Mitigation:
  - idempotent purchase handler
  - transaction-safe business logic
  - purchase reconciliation script
  - audit logging for every purchase event

### Risk 2: Legacy backend fragmentation

- Impact: high
- Risk: Phase 1 ships on mixed data paths that are hard to support
- Mitigation:
  - define source of truth per entity
  - keep temporary bridges explicit
  - block new permanent Convex-only business logic where InsForge is feasible

### Risk 3: Unauthorized content access

- Impact: high
- Risk: readers gain access to books they did not purchase
- Mitigation:
  - strict auth-user ownership checks
  - server-side authorization for full-content routes
  - automated access-control tests

### Risk 4: Content policy and IP issues

- Impact: high
- Risk: infringing or unsafe books are published
- Mitigation:
  - creator rights affirmation
  - admin moderation before publication
  - unpublish workflow
  - policy escalation path

### Risk 5: Scope expansion

- Impact: medium
- Risk: the team adds distribution, social features, or advanced reading too
  early
- Mitigation:
  - P0/P1/P2 prioritization enforced
  - launch gate excludes external distribution
  - weekly scope review with product + engineering

## 18. Definition of Done

### 18.1 Global DoD for every development task

A task is not done until:

1. implementation is complete
2. tests covering the change are added or updated
3. type-check passes
4. relevant documentation is updated
5. security and ownership implications are reviewed
6. QA acceptance criteria are met

### 18.2 DoD for backend tasks

- API contract defined
- ownership checks implemented
- failure states handled
- audit/event records stored where required
- unit/integration tests added

### 18.3 DoD for frontend tasks

- loading, success, and error states implemented
- empty states implemented where relevant
- accessible labels and interactions included
- UX copy reviewed for clarity
- component-level or integration tests added where practical

### 18.4 DoD for marketplace and purchase tasks

- duplicate purchase prevention verified
- insufficient-credit flow verified
- owned-state rendering verified
- purchase success reflected in library without manual refresh issues

### 18.5 DoD for admin/moderation tasks

- role restrictions verified
- reason capture implemented where needed
- moderation state visible to creator
- audit history preserved

## 19. Realism Check for MVP Scope

This Phase 1 scope is realistic **if the team keeps the launch target limited
to Shothik's internal marketplace and library**.

The scope becomes unrealistic if any of the following are added before launch:

- external store distribution
- payout automation
- reviews and ratings
- advanced reading annotations
- recommendation engine
- direct Google Play Books publishing

## 20. Launch Gate

Phase 1 is launch-ready only when:

1. creators can publish books internally
2. readers can buy books with credits
3. readers can access owned books from My Library
4. admins can moderate the catalog
5. purchase and ownership flows are tested end to end
6. operational support can resolve common failures

## 21. Recommended Immediate Next Steps

1. Approve this MVP scope as the Phase 1 baseline.
2. Convert the functional requirements into engineering tickets by workstream:
   - backend/data
   - creator workflow
   - marketplace
   - purchase/library
   - admin/moderation
3. Produce the migration matrix:
   - current implementation
   - source of truth
   - target InsForge model
   - launch dependency
