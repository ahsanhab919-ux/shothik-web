# Batch 5 Publishing Workflow Completion Report

Date: `2026-07-21`

## Scope

Batch 5 completed the active publishing workflow by removing the last legacy
publishing backend split, aligning the author-facing publish lifecycle to the
real moderation/distribution state model, and closing the payout continuity gap
on the active publishing path.

## Pre-Execution Checks

- Batch dependency check:
  - Batch 4 writing workflow consolidation was already complete and documented
- Data-integrity check:
  - verified the active publish routes and UI still use the persisted InsForge
    draft model introduced in Batch 4
- Resource-availability check:
  - `PUBLISHDRIVE_ENABLED=unset`
  - `NEXT_PUBLIC_PUBLISHDRIVE_ENABLED=unset`
  - `PUBLISHDRIVE_WEBHOOK_SECRET=unset`
  - `STRIPE_SECRET_KEY=unset`
- Dependency-configuration check:
  - focused publishing/moderation regression suites exist for the active routes
  - repo TypeScript contract is healthy under `pnpm exec tsc --noEmit --pretty false`

## Processing Status

- Status: `Completed`
- Batch objective: `Met with environment caveat`
- Lifecycle outcome:
  - author review now persists distribution consent
  - publish tracking now reflects the real moderation/distribution lifecycle
  - Stripe payouts can execute from the publishing path through a shared service
  - ONIX export no longer depends on Convex

## Deliverables

- Review and draft persistence:
  - `components/tools/writing-studio/workspace/publish/PublishWizard.jsx`
  - `components/tools/writing-studio/workspace/publish/ReviewSubmit.jsx`
- Status-model convergence:
  - `components/tools/writing-studio/workspace/publish/StatusTracker.jsx`
- Shared payout execution:
  - `lib/books/stripe-payout-service.ts`
  - `app/api/publish/payouts/route.ts`
  - `app/api/stripe/payout/route.ts`
- Legacy bridge removal:
  - `app/api/publish/onix/route.ts`
- Regression coverage:
  - `app/api/publish/onix/route.test.ts`
  - `app/api/publish/payouts/route.test.ts`
  - `app/api/stripe/payout/route.test.ts`
  - `components/tools/writing-studio/workspace/publish/ReviewSubmit.test.jsx`

## Execution Outcomes

1. Distribution consent continuity
   - Added persisted `distributionOptIn` handling to the active publish wizard.
   - Added author-facing consent capture on the review step so later
     distribution submission does not fail on missing consent.

2. Real lifecycle tracking
   - Removed unsupported UI-only status assumptions from the publish tracker.
   - The tracker now derives state from the real book lifecycle plus
     `/api/publish/status` distribution state.

3. Payout continuity
   - Added a shared Stripe payout execution service.
   - `/api/publish/payouts` now executes Stripe payouts directly for the author
     path instead of stopping at a pending request record.
   - `/api/stripe/payout` now reuses the same shared execution contract.

4. Legacy backend removal
   - Migrated ONIX generation to the InsForge-backed book draft service.
   - Removed the active Convex dependency from the ONIX export path.

## Issues Encountered

1. Local provider credentials are unavailable.
   - Impact: live PublishDrive and Stripe provider execution cannot be certified
     from the current local environment.
   - Resolution: preserved graceful local distribution behavior and hardened
     Stripe payout execution to fail closed with an explicit `503` instead of an
     ambiguous partial runtime failure.

2. Publish tracker still reflected unsupported legacy states.
   - Impact: author-facing workflow status could diverge from real backend state.
   - Resolution: aligned tracker rendering to real `draft/submitted/approved/
     distribution/published` progression plus distribution polling.

## Post-Processing Validation

- Accuracy checks:
  - confirmed distribution consent is now part of the persisted draft update set
  - confirmed ONIX export reads from `getBookDraftForUser(...)`
  - confirmed Stripe payouts use one shared execution service from both author
    and direct payout routes
- Performance benchmarking:
  - focused regression suite completed in under `1s` wall-clock on the local
    run (`Duration 799ms`)
- Error-rate verification:
  - focused regression result: `0` failing files, `0` failing tests
  - repo type-check result: `0` TypeScript errors

## Validation Evidence

```bash
pnpm exec tsc --noEmit --pretty false
```

Result: `passed`

```bash
pnpm exec vitest run app/api/publish/payouts/route.test.ts app/api/stripe/payout/route.test.ts app/api/publish/onix/route.test.ts app/api/publish/submit/route.test.ts app/api/publish/status/route.test.ts app/api/admin/books/route.test.ts app/api/admin/books/stats/route.test.ts components/tools/writing-studio/workspace/publish/ReviewSubmit.test.jsx
```

Result: `passed` (`8` files, `20` tests)

## Quality And Security Protocols

- Authentication remained enforced on the publishing, moderation, and payout
  routes.
- Stripe payout execution enforces authenticated-user ownership and fails closed
  if the Stripe account does not belong to the authenticated user.
- Local provider-secret absence now produces an explicit operational error for
  Stripe payouts instead of relying on unsafe implicit configuration.
- High-risk publish/moderation routes retained or gained direct regression
  coverage.

## Recommendations For Subsequent Batches

1. Batch 6 should certify live provider execution by provisioning and verifying
   PublishDrive and Stripe environment secrets in the target environment.
2. Batch 6 should run credentialed end-to-end publishing certification once the
   external provider configuration is available.
3. GitHub live tracker sync should be restored after write-capable token access
   is available.
