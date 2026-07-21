# Environment Variables

## Purpose

This document explains which environment variables are used by `shothik-web`, which ones are public vs server-only, and which are required by specific feature areas.

Source of truth for placeholders:

- [.env.example](file:///Users/user/Pictures/shothik.2/shothik-web/.env.example)

Credential audit entrypoint:

- `pnpm audit:credentials`
- JSON output: `pnpm audit:credentials --json`
- production Vercel env audit: `pnpm audit:vercel:production`

The audit classifies each credential as:

- `configured`
- `placeholder`
- `missing`

Treat `placeholder` as unresolved for staging and production rollout work.

For production rollout readiness, use `pnpm audit:vercel:production` to pull
the live Vercel production environment configuration and fail fast when the
required InsForge core variables or at least one AI provider key are missing.

## Public vs Server-only

### Public (browser-exposed)

Any variable prefixed with `NEXT_PUBLIC_` is embedded into the client bundle and is readable by anyone using the site.

Rules:

- do not put secrets here
- treat these as public configuration, not credentials

### Server-only

Variables without `NEXT_PUBLIC_` are available only to the Node runtime and server route handlers.

Rules:

- secrets belong here only
- store secrets in a secret manager (Vercel, GitHub Secrets, AWS/GCP secret store), not in files
- never commit `.env.local`
- for local-only tooling secrets, use ignored files such as `.env.testsprite.local`

## TestSprite-specific local configuration

TestSprite now supports a repo-local secure setup path for development and MCP
usage.

Preferred sources for `TESTSPRITE_API_KEY`, in order:

1. `process.env.TESTSPRITE_API_KEY`
2. ignored local env files:
   - `.env.local`
   - `.env.testsprite.local`
   - environment-specific variants such as `.env.testsprite.development.local`
3. `process.env.API_KEY` for compatibility

Default behavior:

- `testsprite_tests/tmp/config.json` is **not** used as the default secret
  source anymore
- the temporary MCP config fallback is only enabled when
  `TESTSPRITE_ALLOW_TMP_CONFIG_FALLBACK=true`

Recommended local file:

- `.env.testsprite.local`

Recommended entries:

- `TESTSPRITE_API_KEY`
- `TESTSPRITE_PROJECT_URL`
- `TESTSPRITE_PROJECT_NAME`
- `TESTSPRITE_PROJECT_INSTRUCTION`
- `PLAYWRIGHT_SMOKE_EMAIL`
- `PLAYWRIGHT_SMOKE_PASSWORD`

Trae / MCP note:

- if you configure the TestSprite MCP server in Trae or another MCP client,
  prefer passing `TESTSPRITE_API_KEY` through the client-managed environment
  instead of storing secrets in tracked project files
- the checked-in sample config is
  [docs/mcp/testsprite-claude-desktop-config.json](file:///Users/user/Pictures/shothik.2/shothik-web/docs/mcp/testsprite-claude-desktop-config.json)

## Browser Automation Access

The Playwright suite now uses a shared access contract in
[e2e-env.ts](file:///Users/user/Pictures/shothik.2/shothik-web/e2e/support/e2e-env.ts)
so that local, staging, and protected preview runs enforce the same browser
access rules before navigating.

### Required inputs by scenario

- local browser smoke
  - `PLAYWRIGHT_BASE_URL` optional; defaults to `http://localhost:3000`
- authenticated smoke and lifecycle flows
  - `PLAYWRIGHT_SMOKE_EMAIL`
  - `PLAYWRIGHT_SMOKE_PASSWORD`
- protected Vercel preview domains
  - `PLAYWRIGHT_VERCEL_PROTECTION_BYPASS`
- reusable authenticated sessions
  - `PLAYWRIGHT_USE_AUTH_SETUP=true`
  - optional `PLAYWRIGHT_STORAGE_STATE_PATH`

### Cross-domain and preview access controls

- `PLAYWRIGHT_VERCEL_PROTECTION_BYPASS` is injected as the
  `x-vercel-protection-bypass` header by `playwright.config.ts`
- preview/staging app-level access is still enforced by the application via:
  - `PREVIEW_AUTH_ENABLED`
  - `PREVIEW_ACCESS_ALLOWED_EMAILS`
  - `PREVIEW_ACCESS_ALLOWED_ROLES`
  - `PREVIEW_ACCESS_REQUIRED_SCOPES`
- if `PREVIEW_ACCESS_ALLOWED_EMAILS` is set, the smoke user email used for
  Playwright must be present in that allowlist or authenticated browser flows
  will be blocked after login
- `PREVIEW_ACCESS_ALLOWED_EMAILS` and `PREVIEW_ACCESS_REQUIRED_SCOPES` are
  environment policy values, not provider-issued secrets; define them from the
  preview access contract for the target environment

### Secure credential storage

- keep real Playwright credentials only in ignored local files such as:
  - `.env.local`
  - `.env.testsprite.local`
- keep auth storage state under the ignored `/.playwright` directory
- never commit:
  - smoke account passwords
  - Vercel protection bypass tokens
  - saved browser storage-state JSON files
- prefer environment injection from CI, Vercel, or MCP-managed runtime config
  instead of tracked files

### System and browser permissions

- current certified flows do not require camera, microphone, geolocation, or
  notification permissions
- the automation does require:
  - access to the target origin defined by `PLAYWRIGHT_BASE_URL`
  - local filesystem write access for `test-results`, `playwright-report`, and
    optional `/.playwright` auth state
  - localhost port access when the suite starts the Next.js dev server
- if a future flow adds clipboard, upload, or download requirements, declare the
  extra Playwright permissions in the spec or project instead of relying on
  manual browser prompts

### Recommended commands

Local authenticated reuse:

```bash
PLAYWRIGHT_USE_AUTH_SETUP=true pnpm exec playwright test e2e/authenticated-core-smoke.spec.ts --project=chrome-stable
```

Protected preview:

```bash
PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app \
PLAYWRIGHT_VERCEL_PROTECTION_BYPASS=... \
PLAYWRIGHT_SMOKE_EMAIL=... \
PLAYWRIGHT_SMOKE_PASSWORD=... \
PLAYWRIGHT_USE_AUTH_SETUP=true \
pnpm exec playwright test e2e/authenticated-core-smoke.spec.ts --project=chrome-stable
```

If preview authorization is enabled in the app, also configure the matching
`PREVIEW_ACCESS_*` values on that deployment before running browser automation.

## Core Required Variables

### Routing and app identity

**Public**

- `NEXT_PUBLIC_APP_URL`
  - canonical origin of the frontend app
- `NEXT_PUBLIC_API_URL`
  - external API origin for rewrites and service calls
- `NEXT_PUBLIC_API_URL_WITH_PREFIX`
  - used by some modules that expect a base URL with an existing prefix

### Legacy Convex compatibility

**Public**

- `NEXT_PUBLIC_CONVEX_URL`

**Server-only**

- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`

Note:

- these variables exist only for unmigrated legacy slices
- do not add new Convex dependencies while the InsForge migration is in flight
- keep them only where a specific remaining legacy flow still requires them

### Auth and core platform

**Current required platform baseline**

- `DATABASE_URL` (server-only)
- `NEXT_PUBLIC_INSFORGE_URL` (public)
- `NEXT_PUBLIC_INSFORGE_ANON_KEY` (public)

These three variables are the current required baseline for the active
InsForge-authenticated rollout.

Local verification rule:

- when `.insforge/project.json` points to a staging branch backend,
  `.env.local` must use the same public InsForge host for
  `NEXT_PUBLIC_INSFORGE_URL`
- `.insforge/project.parent.json` remains the production reference and must not
  be copied into local staging verification by accident
- `DATABASE_URL` must be sourced from the matching backend environment before
  any direct Postgres-backed module validation; do not assume the host or
  password can be derived from the public InsForge URL alone
- tracked `.insforge/project.json` and `.insforge/project.parent.json` must be
  treated as non-secret linkage metadata only; do not commit `api_key` values
  inside those files
- if local InsForge CLI work requires an API key or refreshed platform session,
  relink or re-authenticate locally and keep any regenerated secret-bearing
  linkage state out of commits

**Current**

The repo currently still validates Clerk keys in env validation. Until migration is complete, keep these configured.

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (public)
- `CLERK_SECRET_KEY` (server-only)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (public)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (public)

**Target (planned)**

These exist for future auth work and are not the current rollout baseline:

- `BETTER_AUTH_URL` (server-only recommended)
- `NEXT_PUBLIC_BETTER_AUTH_URL` (public)
- `BETTER_AUTH_SECRET` (server-only)

## Feature-specific Variables

### Payments

**Stripe**

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (public)
- `STRIPE_SECRET_KEY` (server-only)
- webhook secrets (server-only):
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_CREDITS_WEBHOOK_SECRET`
  - `STRIPE_STARS_WEBHOOK_SECRET`
  - `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`
- `CREDIT_PURCHASE_SECRET` (server-only)

Notes:

- Stripe is **feature-dependent**, not globally required
- if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set, `STRIPE_SECRET_KEY` must also
  be set
- if Stripe webhook secrets are set, `STRIPE_SECRET_KEY` must also be set

**Razorpay**

- `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public)
- `RAZORPAY_KEY_ID` (server-only)
- `RAZORPAY_KEY_SECRET` (server-only)

### Publishing (PublishDrive)

- `PUBLISHDRIVE_ENABLED` (server-only)
- `NEXT_PUBLIC_PUBLISHDRIVE_ENABLED` (public)
- `NEXT_PUBLIC_PUBLISHDRIVE_API_URL` (public)
- `PUBLISHDRIVE_API_KEY` (server-only)
- `PUBLISHDRIVE_WEBHOOK_SECRET` (server-only)

### Writing Studio integrations

- `NEXT_PUBLIC_ENABLE_WEBMCP_WIDGET` (public)
- `NEXT_PUBLIC_WEBMCP_SCRIPT_URL` (public)

Notes:

- the WebMCP widget is **feature-dependent** and disabled by default
- enable it only when you have a verified browser-compatible widget URL
- if `NEXT_PUBLIC_ENABLE_WEBMCP_WIDGET=true`, set `NEXT_PUBLIC_WEBMCP_SCRIPT_URL`
  to the exact script asset you want the browser to load

### Google Books and Google Drive

Recommended split for a book publishing workflow:

- `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY` (public)
  - only for **public** Google Books metadata/search lookups
  - must be restricted by HTTP referrer and API scope in Google Cloud
- `GOOGLE_BOOKS_API_KEY` (server-only optional)
  - backend alternative for Google Books metadata fetches if browser exposure is
    not desired
- `GOOGLE_DRIVE_CLIENT_ID` (server-only)
- `GOOGLE_DRIVE_CLIENT_SECRET` (server-only)
- `GOOGLE_DRIVE_REDIRECT_URI` (server-only)
  - used for OAuth flows when accessing a user's private Drive manuscripts
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` (server-only)
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` (server-only)
  - used only for automated backend workflows that should act as a service
    account

Important rules:

- a Google Books API key is acceptable for public metadata lookups only when it
  is restricted
- Google Drive access for private user files must use OAuth or a service
  account, not a public browser key
- do not commit unrestricted Google API keys or service-account material
- if a browser-visible Books key is used, treat it as restricted public config,
  not as a secret auth credential

### Document parsing (LiteParse)

Server-only flags and tuning:

- `LITEPARSE_ENABLED`
- `LITEPARSE_MODE`
- `LITEPARSE_OCR_LANGUAGE`
- `LITEPARSE_OCR_SERVER_URL`
- `LITEPARSE_DPI`
- `LITEPARSE_MAX_PAGES`
- `LITEPARSE_NUM_WORKERS`
- `LITEPARSE_DISABLE_OCR`

Also used by UI/metrics:

- `NEXT_PUBLIC_EXTRACT_PDF_V2_ENABLED` (public)

### External AI (LLM)

At least one is required by env validation:

- `KIMI_API_KEY` (server-only)
- `OPENAI_API_KEY` (server-only)
- `ANTHROPIC_API_KEY` (server-only)
- `GEMINI_API_KEY` (server-only)
- `OPENROUTER_API_KEY` (server-only)
- `OPENROUTER_MODEL` (server-only, optional)

Model and base URL tuning:

- `KIMI_BASE_URL`
- `KIMI_MODEL`
- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`
- `OPENROUTER_MODEL`

### Redis / caching / idempotency

**Upstash**

- `UPSTASH_REDIS_REST_URL` (server-only)
- `UPSTASH_REDIS_REST_TOKEN` (server-only)

**Generic Redis**

- `REDIS_URL` (server-only)
- `REDIS_TOKEN` (server-only)

Notes:

- Upstash Redis is the preferred managed path for production
- if Redis is absent, some helpers fall back to in-memory behavior, which is
  acceptable for local development but not ideal for production reliability

### Observability

**PostHog**

- `NEXT_PUBLIC_POSTHOG_HOST` (public)
- `NEXT_PUBLIC_POSTHOG_KEY` (public)

**Sentry**

- `NEXT_PUBLIC_SENTRY_DSN` (public)

### Admin / ops security

- `METRICS_ADMIN_KEY` (server-only)
- `IP_ALLOWLIST` (server-only)
- `API_KEY_SALT` (server-only)
- `GEO_COOKIE_SECRET` (server-only)
- `SESSION_SECRET` (server-only)
- `SECOND_ME_VAULT_SECRET` (server-only)
- `API_KEY_SALT` must be generated by the application operator, for example
  with `openssl rand -hex 32`, and stored as a strong random value
- do not rotate `API_KEY_SALT` in a live environment without an explicit
  rollout window because API key verification depends on a stable salt
- prefer a separate `GEO_COOKIE_SECRET` in production so cookie-signing
  rotation does not couple to API key hashing

## Recommended configuration policy

### Required for all serious environments

- `DATABASE_URL`
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- at least one LLM provider key

### Feature-dependent

- Stripe
- Razorpay / bKash
- PublishDrive
- Google Books / Google Drive
- Redis / Upstash
- geolocation and metrics keys
- Second Me vault secret

### Migration-only

- Convex
- Clerk

Keep migration-only credentials out of new feature work and phase them out as
the remaining legacy slices move to InsForge.

## Local Setup

```bash
cp .env.example .env.local
```

Keep `.env.local` uncommitted.

Run the audit after editing credentials:

```bash
pnpm audit:credentials
```

## CI Notes

CI may need placeholder values for build-time evaluation of certain modules.

The safe baseline is:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `DATABASE_URL`
- optional feature placeholders only when the related module is exercised in CI
