# Shothik Web Repo Analysis & Execution Spec

## Why
The repo has many subsystems (Next.js App Router, Convex, payments, AI tools, agents) and relies on consistent branching + CI gates; new contributors need a single, accurate workflow spec.

## What Changes
- Define a repo-level “how this works” spec covering architecture boundaries, major subsystems, and runtime/data flows.
- Define an explicit branching model aligned with documented branch protection rules and CI triggers.
- Define an execution runbook for local development, validation, CI expectations, and production-safe change workflow.
- **BREAKING**: None (documentation and process clarification only).

## Impact
- Affected specs: repository workflow, branch strategy, CI quality gates, local dev runbook, security baseline.
- Affected code: no runtime behavior changes; references these systems as the source of truth:
  - Next.js routes and API handlers under `app/`
  - Convex functions and schema under `convex/`
  - Shared platform logic under `lib/`, `services/`, `hooks/`, `providers/`, `redux/`
  - CI workflows under `.github/workflows/`
  - Environment contract under `.env.example` and `docs/ENVIRONMENT_VARIABLES.md`
  - Branch protection baseline under `docs/BRANCH_PROTECTION_POLICY.md`

## Repository Analysis (Current State)

### Runtime Entry Points

#### Next.js App Router (default)
- Primary runtime entrypoint is Next.js App Router under `app/`.
- Local dev uses [package.json](file:///workspace/package.json) script `pnpm dev` (`next dev`) and serves on `http://localhost:3000` by default.
- Root UI composition starts at [app/layout.tsx](file:///workspace/app/layout.tsx) (global layout) and route-group layouts like:
  - [app/(primary-layout)/layout.jsx](file:///workspace/app/(primary-layout)/layout.jsx)
  - [app/(secondary-layout)/layout.jsx](file:///workspace/app/(secondary-layout)/layout.jsx)

#### Next.js API Route Handlers (in-repo API)
- Server route handlers live under `app/api/**/route.(ts|js)`.
- This repo contains a large in-repo API surface, including (non-exhaustive):
  - Tools: `app/api/tools/*` (paraphrase, summarize, translator, grammar, ai-detector, plagiarism)
  - Payments: `app/api/stripe/*`, `app/api/razorpay/*`, `app/api/bkash/*`
  - Publishing: `app/api/publish/*`, `app/api/webhooks/publishdrive`
  - Twin/Agent: `app/api/twin/*`
  - Health + docs: `app/api/health`, `app/api/docs/swagger.json`

#### Request Proxy / Security Middleware (edge)
- Proxy + security middleware logic is implemented in [proxy.ts](file:///workspace/proxy.ts).
- Next.js loads edge middleware from `middleware.(ts|js)` at repo root. This repository currently has `proxy.ts` rather than `middleware.ts`, so treat this as:
  - **Current state**: the logic exists in-repo but may not be active unless wired by renaming/adding a `middleware.ts`.
  - **Target state**: the request proxy and security checks run for `/api/*`, `/auth/*`, `/dashboard/*` as defined by the matcher in `proxy.ts`.

#### Custom Node Server (optional, separate from Next default)
- A custom Node entrypoint exists in [server.ts](file:///workspace/server.ts).
- It wraps Next.js and attaches a Socket.IO server at `/paraphrase/socket.io` (default port `5000`), with:
  - JWT/JWKS validation against Convex JWKS when configured
  - Per-socket rate limiting for paraphrase events
  - Paraphrase implementation using CTranslate2 (`NLP_SERVICE_URL`) with a circuit-breaker fallback to Gemini (`AI_INTEGRATIONS_GEMINI_*`)
- This file is not used by default `package.json` scripts; it is an opt-in runtime for streaming paraphrase socket workloads.

### Request + Data Flow (How Requests Resolve)
- UI requests resolve through Next.js App Router pages under `app/**/page.*`.
- API requests resolve via one of two paths:
  - **In-repo API**: `app/api/**` route handlers (first-class in this repo).
  - **Fallback proxy to external API origin**: Next.js rewrites in [next.config.ts](file:///workspace/next.config.ts) route `/api/*` and `/paraphrase/*` to `NEXT_PUBLIC_API_URL` as a fallback. This supports hybrid deployments where some endpoints live outside this repo.
- Data access is split between:
  - **Convex** for primary product data and real-time app state.
  - **MongoDB (Mongoose)** for specific chat/session persistence flows (Research + Sheet).

### Data Layer (Persistence + Contracts)

#### Convex (primary)
- Schema lives in [convex/schema.ts](file:///workspace/convex/schema.ts); generated bindings under `convex/_generated/`.
- Major table groups and domains (representative, not exhaustive):
  - **Projects + Writing**: `projects`, `projectVersions`, `chapters`, `versions`, `writingAutosaves`, `writingProfiles`
  - **Books + Publishing**: `books`, `chapterAttempts`, `distributionRecords`, `distributions`, `isbnPool`, `latexBuilds`
  - **Payments + Monetization**: `subscriptionPlans`, `userSubscriptions`, `contentPurchases`, `payouts`, `payoutAccounts`, `userCredits`, `creditTransactions`, `starBalances`, `starTransactions`
  - **Community**: `forums`, `forum_posts`, `forum_reactions`, `forum_reservations`, `forum_chat`, `channels`, `channelMemberships`, `votes`
  - **Twins/Agents**: `twins`, `twin_tasks`, `twin_knowledge`, `twin_activity_log`, `twin_transfer_requests`, `twin_pending_approvals`, legacy `agents/*`
  - **Security + Auditability**: `auditEvents`, `webhookEvents`

#### MongoDB via Mongoose (feature-scoped)
- MongoDB connection helper: [dbConnect](file:///workspace/lib/dbConnect.ts).
- Models under `models/` (Mongoose schemas), used by route handlers under:
  - `app/api/research/**` using [ResearchChat](file:///workspace/models/ResearchChat.ts)
  - `app/api/sheet/**` using [SheetChat](file:///workspace/models/SheetChat.ts), [SheetSession](file:///workspace/models/SheetSession.ts), [SheetConversation](file:///workspace/models/SheetConversation.ts)
- This is a secondary data store and should be treated as a feature-scoped dependency (enable only when those flows are active).

#### Prisma (planned / scaffolding)
- Prisma config exists ([schema.prisma](file:///workspace/prisma/schema.prisma)) and is referenced by the planned Better Auth migration (`DATABASE_URL` in env docs).
- Treat Prisma as **present but not the primary runtime data layer** today; Convex remains the active contract for most product features.

### Domain / Feature Map (Where to Change What)
- **Core UI routes**: `app/` (App Router pages and layouts)
- **Tooling (AI tools)**:
  - UI pages: `app/(primary-layout)/*` (e.g. paraphrase, translator, ai-detector, grammar-checker, summarize)
  - API: `app/api/tools/*`
  - Services: `services/*.service.(ts|js)`
  - UI components: `components/` (tool-specific subfolders)
- **Plagiarism**:
  - UI components: `components/plagiarism/`
  - Services + orchestration: `services/plagiarismService.ts`, `services/PlagiarismRequestManager.js`
  - API: `app/api/tools/plagiarism/**`
- **Writing Studio + Projects**:
  - UI pages: `app/(primary-layout)/writing-studio/**`
  - Core components: `components/writing-studio/**`
  - Convex functions: `convex/writing.ts`, `convex/projects.ts`
- **Books + Publishing**:
  - UI pages: `app/(primary-layout)/books/**`, `app/(primary-layout)/community/**` (forums around books)
  - API: `app/api/books/**`, `app/api/publish/**`, `app/api/webhooks/publishdrive/route.ts`
  - Convex: `convex/books.ts`, `convex/publishing.ts`, `convex/forums.ts`
  - Integrations: `services/publishDriveService.js`
- **Payments + Subscriptions**:
  - API: `app/api/stripe/**`, `app/api/razorpay/**`, `app/api/bkash/**`
  - Convex: `convex/billing.ts`, `convex/subscriptions.ts`, `convex/credits.ts`, `convex/payouts.ts`
  - Shared code: `lib/stripe-config.ts`, `lib/payment-config.ts`, `lib/usage-enforcement.ts`
- **Twins / Agents**:
  - UI page: `app/(primary-layout)/twin/page.tsx`
  - API: `app/api/twin/**`
  - Convex: `convex/twin.ts`, `convex/secondMe.ts`, `convex/twin_lifecycle_transitions.ts`
  - Shared: `lib/twin-*.ts`, `hooks/useTwin.ts`, `components/twin/**`
- **Slides / Presentation**:
  - UI pages: `app/(slide-layout)/**`
  - Components: `components/presentation/**`, `components/slide/**`
  - Services: `services/presentation/**`
- **State / Providers**:
  - Redux store + slices: `redux/`
  - App providers: `providers/` including [ConvexClientProvider](file:///workspace/providers/ConvexClientProvider.jsx)
- **i18n**:
  - Locale data: `i18n/locales/*`
  - Sync hooks: `i18n/useLoadConvexLocale.ts`, `i18n/useSyncLocaleToConvex.ts`

### Branches, CI, and Quality Gates

#### Observed branches (local clone)
- Current local git branch: `main` (release branch).
- `develop` is described as optional in policy, but it is not present in this clone today.

#### CI workflows and triggers
- Core CI: [ci.yml](file:///workspace/.github/workflows/ci.yml)
  - Triggers on pushes to `main`, `develop`, and `feat/**`, `fix/**`, `chore/**`, `docs/**`, `refactor/**`, `test/**`
  - Triggers on PRs targeting `main` or `develop`
  - Required gates: `pnpm install --frozen-lockfile`, `pnpm type-check`, `pnpm test:coverage`, `pnpm build`
  - Manual-only job: Playwright smoke suite on `workflow_dispatch`
- Security CI: [security.yml](file:///workspace/.github/workflows/security.yml)
  - Triggers on PRs and pushes to `main`/`develop`, plus a weekly schedule
  - Includes dependency review, CodeQL, Gitleaks, pnpm audit, license compliance, Trivy scans, container image scan + provenance, optional SonarCloud
- DAST: [dast.yml](file:///workspace/.github/workflows/dast.yml)
  - Manual-only baseline scan against a provided staging URL

#### Branch naming and CI alignment
- CI explicitly triggers on these prefixes (push):
  - `feat/**`, `fix/**`, `chore/**`, `docs/**`, `refactor/**`, `test/**`
- Hotfix branches (`hotfix/**`) are permitted by policy but are not included in the push triggers; they still get full validation via a PR to `main` (or direct workflow dispatch if needed).

## Local Execution Runbook (Developer Workflow)

### Prerequisites
- Node.js 20.x
- pnpm 10.x (see [package.json](file:///workspace/package.json) and CI)
- Convex CLI access (via `pnpm exec convex ...`) if making schema/function changes
- Optional dependencies by feature:
  - MongoDB connection string (`MONGODB_URI`) for Research/Sheet routes
  - Payment provider sandboxes for Stripe/Razorpay/bKash routes
  - PublishDrive sandbox for publishing flows

### Setup
- Install deps:
  - `pnpm install`
- Configure environment:
  - `cp .env.example .env.local`
  - Reference: [.env.example](file:///workspace/.env.example) and [ENVIRONMENT_VARIABLES.md](file:///workspace/docs/ENVIRONMENT_VARIABLES.md)

### Minimal environment for common local flows
- App boot + Convex-connected UI:
  - `NEXT_PUBLIC_CONVEX_URL`
  - `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` (recommended for consistent routing/rewrites)
- Auth placeholders may be required by some modules until migration is complete:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Enable Research/Sheet persistence (MongoDB-backed):
  - `MONGODB_URI`
- Exercise payment APIs:
  - `STRIPE_SECRET_KEY` (and relevant webhook secrets for webhook tests)
- Exercise book-service admin Convex transport:
  - `CONVEX_DEPLOY_KEY` (see [convex-book-client.ts](file:///workspace/lib/book/convex-book-client.ts))

### Run
- Start the Next.js dev server:
  - `pnpm dev`
- Optional (only when changing Convex functions/schema):
  - `pnpm exec convex dev`

### Local validation (pre-PR)
- Match CI core gates locally:
  - `pnpm ci:local`
- Security checks (especially for dependency changes):
  - `pnpm security:audit`
  - `pnpm security:licenses`
- Optional E2E smoke (requires Playwright browsers):
  - `pnpm exec playwright install --with-deps`
  - `pnpm exec playwright test`

### Current vs Target State Notes (avoid confusion during changes)
- Auth:
  - Current validation paths still reference Clerk env keys.
  - Better Auth + Prisma (`DATABASE_URL`) exist as planned/target state and are not the primary runtime path today.
- Middleware:
  - `proxy.ts` contains the intended middleware/proxy logic; ensure it is wired as `middleware.ts` before relying on it in production.

## ADDED Requirements

### Requirement: Repository Architecture Contract
The repository SHALL document and preserve the following high-level architecture boundaries:
- Next.js App Router is the primary entry point for UI rendering and API route handlers.
- Convex is the active data layer used by the product and remains in-repo.
- External services (NLP, AI detector, plagiarism, payments, Redis, observability) are consumed via environment-configured endpoints and secrets.

#### Scenario: Identify the correct layer for a change
- **WHEN** a developer needs to add a new UI page
- **THEN** the change SHOULD live under `app/` and use components/hooks/providers as needed
- **AND** server-only secrets MUST NOT be referenced in client components

#### Scenario: Add a new server API endpoint
- **WHEN** a developer adds a new API route
- **THEN** it SHOULD be implemented as an `app/api/**/route.(ts|js)` handler
- **AND** it SHOULD perform input validation, auth/authorization checks, and orchestration only (domain logic stays in shared modules)

### Requirement: Branching Model
The repository SHALL use a consistent branch model that supports secure review and predictable CI execution:
- `main` is the release branch (protected).
- `develop` MAY exist as an integration branch (optional, per policy).
- Short-lived branches MUST be created from `main` (or `develop` if enabled).
- Branch naming MUST follow the allowed prefixes used by CI triggers:
  - `feat/**`, `fix/**`, `chore/**`, `docs/**`, `refactor/**`, `test/**`, `hotfix/**`

#### Scenario: Create a feature branch
- **WHEN** a developer starts new work
- **THEN** they create `feat/<summary>` from `main`
- **AND** they open a pull request back to `main` (or `develop` if the team adopts it)

#### Scenario: Emergency hotfix
- **WHEN** production is down or user data/payment behavior is at risk
- **THEN** a developer creates `hotfix/<summary>` from `main`
- **AND** merges the smallest viable change set with expedited review, followed by a remediation PR

### Requirement: CI Quality Gates (Repository-Scoped)
The repository SHALL maintain a deterministic, repo-scoped CI baseline:
- Dependency install uses `pnpm install --frozen-lockfile`.
- Type safety uses `pnpm type-check`.
- Unit/integration tests use `pnpm test:coverage`.
- Build validation uses `pnpm build` with safe placeholder env values when required for module initialization.

#### Scenario: Pull request validation
- **WHEN** a pull request targets `main` or `develop`
- **THEN** CI runs type-check, test coverage, and production build as defined in `.github/workflows/ci.yml`
- **AND** the PR is not merged unless required checks succeed (per branch protection policy)

### Requirement: Environment Contract
The repository SHALL treat environment variables as a contract:
- Public variables are prefixed with `NEXT_PUBLIC_` and MUST NOT contain secrets.
- Server-only secrets MUST NOT be committed and MUST be sourced from a secret manager in production.
- CI MUST supply safe placeholders for any variables that are required at build time.

#### Scenario: Local development setup
- **WHEN** a developer starts locally
- **THEN** they copy `.env.example` to `.env.local`
- **AND** they set at least the minimal variables for the flows they are testing (Convex URL, auth keys, and relevant integration keys)

## MODIFIED Requirements

### Requirement: Branch Protection Implementation Status
The system documentation SHALL describe branch protection expectations AND current enforcement constraints:
- Branch protection is the intended baseline for `main` (and optionally `develop`).
- If the GitHub plan prevents enforcement, the repo SHALL still rely on CI + review discipline until protections are enabled.

## REMOVED Requirements
None.
