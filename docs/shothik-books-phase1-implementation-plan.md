# Shothik Books Phase 1 Implementation Plan

## Goal

Translate the approved Phase 1 MVP specification into an implementation-ready
 engineering plan centered on Shothik's internal marketplace, purchase flow,
 and owned-reader library.

## Execution Scope

Phase 1 includes:

- creator draft creation and submission
- marketplace browse and book detail pages
- credit-based purchase flow
- library ownership and access enforcement
- moderation and publish-state management

Phase 1 excludes:

- external distribution
- payout automation
- advanced social reading
- subscription reading

## P0 Delivery Slices

### Slice 1: Data Model And Ownership

#### Backend tasks

1. define InsForge-backed tables for:
   - `books`
   - `book_assets`
   - `book_purchases`
   - `book_library_entries`
   - `book_moderation_events`
2. define status lifecycle:
   - `draft`
   - `submitted`
   - `approved`
   - `published`
   - `rejected`
   - `unpublished`
3. add ownership and moderation RLS rules
4. define audit fields and creator/admin visibility fields

#### Acceptance criteria

- creator-owned records are readable and writable only by authorized users
- purchased books are accessible only to buyers and authorized admins
- moderation state changes are auditable

### Slice 2: Creator Draft Workflow

#### Application tasks

1. create draft entry flow
2. save and resume draft state
3. validate required fields before review submission
4. submit for review and surface status feedback

#### Acceptance criteria

- a creator can create, save, reopen, and submit a draft
- invalid drafts cannot be submitted
- creators can see rejection/unpublish reasons

### Slice 3: Marketplace And Book Detail

#### Application tasks

1. render published books only in marketplace browse
2. add title/category search and filtering
3. render book detail page with:
   - metadata
   - description
   - cover
   - price
   - ownership state
4. display `buy` for non-owned books and `read` for owned books

#### Acceptance criteria

- unpublished books do not appear in browse results
- owned state is reflected correctly on the detail page
- search and category filtering work on published inventory

### Slice 4: Purchase And Library Ownership

#### Application tasks

1. connect purchase path to credits wallet
2. enforce one successful purchase record per user/book pair
3. deduct credits exactly once on successful purchase
4. write owned-library record and expose owned-book access

#### Acceptance criteria

- duplicate purchases are blocked
- balance deduction is idempotent
- purchased books appear in the buyer library immediately

### Slice 5: Moderation And Admin Controls

#### Application tasks

1. expose moderation states and review actions
2. allow admins to approve, publish, reject, and unpublish
3. capture moderation reasons and timestamps

#### Acceptance criteria

- only authorized admins can change publish state
- moderation actions are visible in system history

## Test Plan

### Unit

- draft validation
- ownership guard helpers
- publish-state transitions
- price and credits validation

### Integration

- creator draft save and submit flow
- purchase to library state transition
- moderation transition logic

### End-to-end

- creator creates and submits draft
- admin publishes approved book
- reader buys book and accesses library copy

## Dependencies

- production auth/chat rollout must be stabilized before production Books launch
- credits wallet flows must stay available for purchase integration
- final InsForge schema decisions must be approved before migration work begins

## Recommended Execution Order

1. schema and RLS design
2. creator draft workflow
3. marketplace and detail page
4. purchase and owned library
5. moderation controls
6. full regression and release validation

## Definition Of Ready

- scope is locked to Phase 1 internal marketplace only
- schema targets are agreed
- acceptance criteria are approved
- test matrix is defined
