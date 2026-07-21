# Project Platform Setup

## Purpose

This document is the setup baseline for the external project integrations that
need to be correct before staging and production rollout work continues.

Services covered:

- GitHub
- Vercel
- InsForge
- Cloudflare
- TestSprite

## Current Repo State

### GitHub

Present in repo:

- remote `origin = https://github.com/ahsanhab919-ux/shothik-web.git`
- GitHub Actions workflows in `.github/workflows/`
- `CODEOWNERS`
- PR template
- branch protection policy doc

Current branch during this audit:

- `staging/insforge-chat-auth`

Notes:

- CI and security workflows exist and are usable.
- Branch protection was previously documented as partially blocked by GitHub
  plan limitations for this private repository.

### Vercel

Present in repo:

- `.vercel/project.json`

Current linked Vercel project name:

- `trae_shothik-web_gxhx`

Notes:

- Vercel linkage exists.
- Preview environment variable setup is still the main staging blocker.

### InsForge

Present in repo:

- `.insforge/project.json`
- `.insforge/project.parent.json`

Current linked InsForge backend:

- staging branch project: `staging-chat-auth`
- staging host: `https://ers8j28a-kj5.ap-southeast.insforge.app`

Parent production InsForge backend:

- project: `shothik-web`
- production host: `https://ers8j28a.ap-southeast.insforge.app`

Notes:

- InsForge is already installed and linked correctly for staged rollout work.
- The repo is currently pointed at the staging branch backend, which is the
  right default during verification.
- tracked InsForge linkage files must remain sanitized reference metadata only;
  project API keys may exist in a local working tree after a manual relink, but
  they must not be committed

### Cloudflare

Present in repo:

- no dedicated Cloudflare config or runbook found

Notes:

- Cloudflare appears to be an external platform concern only right now.
- We should treat it as DNS / proxy / SSL infrastructure, not app runtime
  configuration inside this repo.

### TestSprite

Present in repo:

- TestSprite MCP workspace files under `testsprite_tests/`
- Playwright E2E support exists in the repo (`playwright.config.ts`, `e2e/`)

Notes:

- TestSprite is now initialized at the workspace level through MCP artifacts:
  - `testsprite_tests/standard_prd.json`
  - `testsprite_tests/testsprite_frontend_test_plan.json`
  - `testsprite_tests/tmp/code_summary.yaml`
  - `testsprite_tests/testsprite-mcp-test-report.md`
- The repo's existing Playwright E2E foundation remains the right baseline for
  extending TestSprite coverage.
- In this sandbox, TestSprite CLI execution needs a workspace-local `HOME`
  override because writes to `~/Library/Preferences` are blocked.

## Required Correct Setup

## 1. GitHub

Required repository settings:

- default branch: `main`
- squash merge: enabled
- merge commits: disabled
- rebase merge: disabled
- delete head branches after merge: enabled

Required branch protection for `main`:

- pull requests required
- minimum approvals: `2`
- CODEOWNERS review required
- stale approvals dismissed
- last push approval required
- linear history required
- signed commits required

Required checks:

- `Validate Web App`
- `Dependency Review`
- `CodeQL`
- `Secret Scan`
- `Dependency Audit`
- `License Compliance`
- `Trivy File System Scan`
- `Build And Scan Container Image`

Required secrets to review in GitHub Actions:

- `SONAR_TOKEN` if SonarCloud should run
- any future Vercel deploy token if CLI deploy is moved into Actions
- any future TestSprite token if TestSprite is integrated through Actions

## 2. Vercel

Required project setup:

- connect the GitHub repo to the correct Vercel project
- keep Preview for staging verification
- keep Production for live rollout only

Required Preview env vars for staging:

- `NEXT_PUBLIC_INSFORGE_URL = https://ers8j28a-kj5.ap-southeast.insforge.app`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY = <staging anon key>`
- `DATABASE_URL = <staging Postgres URL>`

Required Production env vars for production:

- `NEXT_PUBLIC_INSFORGE_URL = https://ers8j28a.ap-southeast.insforge.app`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY = <production anon key>`
- `DATABASE_URL = <production Postgres URL>`

Recommended Vercel project settings:

- production branch: `main`
- preview branches: all feature and staging branches
- automatic preview deployments: enabled
- sensitive env vars marked sensitive

Important rollout rule:

- deploy application code before applying the production migration that depends
  on the new chat auth ownership model

## 3. InsForge

Required project structure:

- production backend = `shothik-web`
- staging backend branch = `staging-chat-auth`

Required checks:

- staging migrations applied only to staging backend first
- production migration held until production app code is already live
- auth and chat verification completed against staging before production cutover

Required local files:

- `.insforge/project.json` should point to staging during verification work
- `.insforge/project.parent.json` should preserve the production reference
- neither tracked file should retain a committed `api_key`; rotate or relink
  locally if a prior secret-bearing copy was ever committed

Required local env alignment during staging verification:

- `.env.local` must set `NEXT_PUBLIC_INSFORGE_URL` to the same `oss_host` value
  stored in `.insforge/project.json`
- if local `.env.local` still points `NEXT_PUBLIC_INSFORGE_URL` at the
  production host while `.insforge/project.json` points to staging, treat that
  as configuration drift and fix it before auth or browser validation
- `DATABASE_URL` must come from the matching staging Postgres environment before
  testing any direct-Postgres module; do not reuse a production Postgres URL
  with a staging InsForge auth host

## 4. Cloudflare

Recommended ownership:

- Cloudflare should manage DNS and SSL for the public domain
- Vercel should remain the app host unless there is a separate proxy decision

Required Cloudflare records to verify:

- apex domain points to Vercel using the recommended Vercel DNS target
- `www` points to Vercel
- any API or custom subdomain records are explicit and documented

Recommended Cloudflare settings:

- SSL mode: Full
- always use HTTPS: enabled
- automatic HTTPS rewrites: enabled
- caching rules reviewed so they do not break auth cookies or dynamic app routes
- WAF enabled with conservative defaults

Do not enable aggressive caching in front of authenticated app routes until the
 login and chat flows are verified in production.

## 5. TestSprite

Recommended initial setup:

- connect TestSprite to this GitHub repo
- target the existing Playwright E2E suite instead of creating a separate test
  stack first
- run against Vercel Preview URLs
- set `PLAYWRIGHT_BASE_URL` to the Vercel Preview deployment URL so the same
  smoke suite can run remotely without starting a local dev server

Suggested first TestSprite scenarios:

- sign up
- sign in
- sign out
- create chat
- send message
- reload and confirm history persists
- delete chat

Current repo-ready TestSprite setup:

- PRD source is generated and stored in `testsprite_tests/standard_prd.json`
- code summary is stored in `testsprite_tests/tmp/code_summary.yaml`
- frontend browser plan is stored in
  `testsprite_tests/testsprite_frontend_test_plan.json`
- a six-case public smoke batch now passes for:
  - invalid sign-in feedback
  - homepage load
  - health endpoint
  - swagger JSON protection response
  - public paraphrase page
  - dashboard compatibility redirect
- the latest curated verification report is recorded in
  `testsprite_tests/testsprite-mcp-test-report.md`
- local CLI execution is available through:
  - `pnpm testsprite:mcp <command>`
  - `pnpm testsprite:run`
  - `pnpm testsprite:status`
  - `pnpm testsprite:unlock`
  - `pnpm testsprite:project --url https://<live-preview-or-staging-url>`
  - `pnpm testsprite:audit`
  - `pnpm testsprite:report`
- local CLI execution uses `scripts/run-testsprite-local.mjs` to force a
  workspace-local `HOME` so TestSprite works in sandboxed environments
- local CLI authentication is verified through the workspace-local
  `.testsprite-home` profile
- TestSprite secrets can now be loaded from:
  - Trae or MCP client environment configuration (`TESTSPRITE_API_KEY`)
  - ignored local env files (`.env.local` or `.env.testsprite.local`)
  - process environment in the active shell
- cloud project bootstrap is now automated through
  `scripts/bootstrap-testsprite-project.mjs`, which can create, update, or
  no-op a managed TestSprite project and store synced metadata in
  `testsprite_tests/tmp/project.json`
- `pnpm testsprite:audit` now generates a live readiness inventory with
  completed workstreams, pending tasks, priorities, dependencies, and owner
  mapping

Current remaining gaps for broader browser automation:

- configure `TESTSPRITE_API_KEY` through Trae MCP env, shell env, or an ignored
  local env file only if the workspace-local `.testsprite-home` profile is not
  already authenticated on the current machine
- authenticated TestSprite journeys still need valid credentials in
  `PLAYWRIGHT_SMOKE_EMAIL` and `PLAYWRIGHT_SMOKE_PASSWORD`
- Vercel preview URLs that redirect through interactive SSO or other protection
  pages are not valid TestSprite cloud targets, even if Vercel reports the
  deployment itself as `Ready`
- the staged custom domain `staging.shothikgpt.com` is now the preferred
  TestSprite cloud target because it is publicly reachable and mapped to the
  `staging/insforge-chat-auth` preview branch
- if Vercel `Deployment Protection` is re-enabled, keep staging public through
  `Advanced Deployment Protection` exceptions or a separate public staging
  project; otherwise TestSprite cloud bootstrap will regress back to interactive
  `vercel.com/sso-api` redirects

Recommended MCP client config:

The same config is also stored in `docs/mcp/testsprite-claude-desktop-config.json`.

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "npx",
      "args": ["-y", "@testsprite/testsprite-mcp@latest"],
      "env": {
        "API_KEY": "${TESTSPRITE_API_KEY}"
      }
    }
  }
}
```

Recommended local shell usage:

```bash
TESTSPRITE_API_KEY=your_testsprite_api_key pnpm testsprite:run
TESTSPRITE_PROJECT_URL=https://<live-preview-or-staging-url> pnpm testsprite:project
pnpm testsprite:audit
pnpm testsprite:report
```

Recommended local file-based setup:

```bash
cp .env.example .env.testsprite.local
```

Then set only the TestSprite-specific keys you need in `.env.testsprite.local`:

```bash
TESTSPRITE_API_KEY=your_testsprite_api_key
TESTSPRITE_PROJECT_URL=https://<live-preview-or-staging-url>
PLAYWRIGHT_SMOKE_EMAIL=<test-account-email>
PLAYWRIGHT_SMOKE_PASSWORD=<test-account-password>
```

Notes:

- prefer `TESTSPRITE_API_KEY` in Trae MCP env config, your shell, or
  `.env.testsprite.local` rather than committing API keys into repo files
- `.env.testsprite.local` and all environment-specific `testsprite` env files
  are ignored by git
- the local runner no longer relies on `testsprite_tests/tmp/config.json` by
  default for API key resolution
- use `TESTSPRITE_ALLOW_TMP_CONFIG_FALLBACK=true` only as a temporary recovery
  step if you need to recover from a prior MCP-generated local config
- `pnpm testsprite:project` validates the target URL before creating or
  updating the cloud project
- Vercel preview URLs that redirect to `vercel.com/sso-api` or login pages are
  intentionally rejected by `pnpm testsprite:project`; use a publicly reachable
  staging or custom-domain URL instead
- the current working cloud bootstrap target is
  `https://staging.shothikgpt.com`
- localhost and `127.0.0.1` are intentionally rejected for cloud project
  bootstrap; keep local execution on the MCP tunnel runner
- `pnpm testsprite:run` now distinguishes active vs stale execution locks
- use `pnpm testsprite:status` to inspect the current lock owner
- use `pnpm testsprite:unlock` to remove only stale locks
- use `pnpm testsprite:unlock --force` only when you intentionally want to
  stop an active stuck run and clear the lock

Suggested trigger model:

- run on PR preview deployments
- optional nightly run on staging

Playwright readiness note:

- `playwright.config.ts` now supports both local runs and remote Preview runs
- local usage: no extra env needed
- remote Preview usage:

```bash
PLAYWRIGHT_BASE_URL=https://<your-preview-url> pnpm exec playwright test
```

## Setup Order

Use this order:

1. GitHub baseline and required checks
2. InsForge staging and production mapping
3. Vercel Preview env vars and project linkage
4. Staging deploy and validation
5. Cloudflare DNS verification for production domain
6. TestSprite integration on Preview deployments

## Upstash And Cloudflare Workers Recommendation (2026-07-15)

### Executive recommendation

- Adopt **Upstash Redis** for production caching, rate limiting, idempotency,
  and lightweight AI/job state.
- Do **not** adopt **Upstash Box** for the main web app runtime.
- Adopt **QStash** or **Upstash Workflow** only for clearly asynchronous,
  retry-heavy, or schedule-driven jobs.
- Keep **Cloudflare** focused on DNS, SSL, CDN, and WAF first.
- Do **not** move the main authenticated Next.js app path to **Cloudflare
  Workers** during the current InsForge migration phase.

### Why this fits the current repo

The repo already uses Upstash Redis client paths in:

- `lib/infrastructure/redis.ts`
- `lib/security/idempotency.ts`
- `lib/ai/rag-pipeline.ts`
- `lib/ai/hallucination-guardrail.ts`
- `lib/ai/golden-dataset.ts`

That means Upstash Redis is already a natural fit for the existing app, while
QStash, Workflow, Box, and Workers would be new architecture decisions.

### Cost analysis by Upstash product

#### 1. Upstash Redis

Best fit: **yes**

Why it can save money:

- pay-per-request pricing is a better match than provisioning a full Redis
  cluster for variable traffic
- works well with Vercel/serverless patterns and avoids idle-instance spend
- supports REST access for edge/serverless runtimes where TCP is awkward
- fits the app's existing use cases:
  - rate limiting
  - idempotency
  - caching
  - short-lived AI/job state

When it is a good production choice:

- traffic is bursty or moderate
- you want low ops overhead
- you do not want to run your own Redis container or managed cluster

When it may be less cost-effective:

- extremely high sustained command volume with very predictable traffic may
  justify comparing against a dedicated Redis service
- Prod Pack adds a significant fixed premium, so use it only when SLA/compliance
  requirements truly require it

Recommendation:

- **Use Upstash Redis now**
- start with pay-as-you-go unless traffic is already stable enough for a fixed
  plan decision

#### 2. Upstash QStash

Best fit: **conditional**

Why it can save money:

- offloads retries, scheduling, and delivery handling from app code
- reduces the need to keep long-running worker processes alive
- useful when you would otherwise build a separate queue + scheduler stack

Why it can also increase cost:

- every delivery attempt is billed, including retries
- not a good replacement for low-latency in-request work
- unnecessary if the app only has a small number of background events

Good use cases for this repo:

- webhook fan-out
- retrying external provider callbacks
- delayed notifications and scheduled cleanup jobs
- non-critical background publishing/payment follow-ups

Recommendation:

- **Do not add QStash broadly**
- add it only for specific retry/scheduling workloads that are currently
  fragile or would require their own queue infrastructure

#### 3. Upstash Workflow

Best fit: **conditional, narrower than Redis**

Why it can save money:

- durable steps avoid rerunning an entire long task after partial failure
- helpful on serverless platforms with execution limits
- can replace hand-built workflow orchestration

Why it can add complexity:

- introduces a workflow programming model the repo does not currently use
- overkill for simple API handlers and synchronous product flows

Good use cases for this repo:

- long AI processing chains
- multi-step export/publishing jobs
- human-in-the-loop flows with wait/resume behavior

Recommendation:

- **Use only for clearly long-running, multi-step jobs**
- do not introduce it into the core request path or auth/chat flows

#### 4. Upstash Box

Best fit: **no for core production runtime**

Why:

- Box is more appropriate for isolated agent computers, parallel testing,
  coding agents, or task sandboxes
- Shothik’s core web app does not need per-user cloud computers to serve normal
  product requests
- it would add cost and operational surface area without solving the current
  production bottlenecks

Possible future fit:

- dedicated AI-agent execution sandboxes
- PR review or evaluation infrastructure
- isolated user-run automations

Recommendation:

- **Do not add Box to the main production architecture**

### Cloudflare Workers assessment

Best fit right now: **no for primary app runtime, yes for selective edge use**

Why not for the main app right now:

- the current app is already centered on Next.js + Vercel + InsForge
- adding Workers into authenticated request routing would increase complexity
  around cookies, preview gating, and deployment debugging
- it would slow the current migration by introducing another runtime boundary

Where Workers can still make sense later:

- lightweight public edge endpoints
- geo-based request shaping
- bot/WAF enforcement
- edge token bucket rate limiting combined with Upstash Redis
- specialized webhook ingestion or fan-out

Recommendation:

- keep Cloudflare as:
  - DNS
  - SSL
  - CDN
  - WAF
- consider Workers later only for narrow public-edge workloads with clear
  latency or cost benefits

### Recommended production approach

Use this order of adoption:

1. **InsForge** as the system of record for app backend and auth
2. **Vercel** for the Next.js app runtime
3. **Cloudflare** for DNS, TLS, CDN, and WAF
4. **Upstash Redis** for cache/rate-limit/idempotency/state
5. **QStash / Workflow** only where async durability is clearly needed
6. **Skip Box** unless agent sandboxing becomes a product requirement

### What we would miss if we skip Upstash entirely

- a clean managed Redis path for:
  - rate limiting
  - idempotency
  - ephemeral cache
  - serverless-friendly shared state

Given the current repo already contains Upstash Redis integration points,
skipping it likely means either:

- falling back to weaker in-memory behavior in production, or
- replacing it with another managed Redis product and additional setup work

### Final recommendation

For this project, the cost-efficient production choice is:

- **Yes** to Upstash Redis
- **Maybe later** to QStash/Workflow for specific async jobs
- **No** to Box for the core app
- **No** to moving the main app to Cloudflare Workers during the current phase

## Immediate Next Actions

These are the next concrete tasks from the current state:

1. Finish Vercel Preview env vars for staging
2. Deploy Preview from `staging/insforge-chat-auth`
3. Verify auth and chat end-to-end against staging InsForge
4. Record results in `docs/insforge-chat-auth-rollout.md`
5. Review GitHub branch protection against the documented baseline
6. Verify Cloudflare DNS and SSL settings for the production domain
7. Decide whether TestSprite should be added now or after staging passes

## Gaps Found During Audit

- `docs/ENVIRONMENT_VARIABLES.md` still reflects older Convex / Clerk-era
  assumptions and should be refreshed after the InsForge rollout stabilizes.
- No Cloudflare project runbook is present yet.
- No TestSprite integration or token wiring is present yet.
- The repo is correctly linked to staging InsForge, but Vercel Preview setup is
  still unfinished.

## Revised Platform Model

The current repo supports a stronger product model than "AI tools plus a few
extras". Shothik is better understood as an **AI-assisted asset creation,
collaboration, distribution, and monetization platform**.

The core value loop is:

1. users create assets
2. agents help improve or extend those assets
3. community and channels make the assets discoverable
4. marketplace and distribution make the assets monetizable
5. user identity, audience, and earnings compound over time

This framing matches the visible product surfaces in the repo more accurately
than treating each tool as a standalone feature.

### Asset lifecycle

Use this lifecycle as the product planning baseline:

1. create asset
2. refine asset
3. collaborate on asset
4. share asset
5. distribute asset
6. monetize asset
7. grow audience around asset

This applies to both small assets and large ones:

- small assets:
  - paraphrased text
  - humanized text
  - summaries
  - translations
  - AI detection reports
  - research notes
  - slide decks
  - sheet outputs
- large assets:
  - books
  - manuscripts
  - channel-ready previews
  - agent-assisted content products

## Service Catalog

### 1. Legacy Writing Suite

Core tools:

- paraphraser
- humanizer
- summarizer
- AI detector
- translator

Role in the platform:

- highest-frequency entry point
- easiest free-to-paid conversion path
- turns quick jobs into reusable content assets

Recommended monetization:

- free tier with strict caps
- paid tiers by usage volume, quality level, and export options

### 2. Workspaces

Primary workspaces visible in the repo:

- research
- sheet
- slide
- writing studio

Role in the platform:

- converts one-off utility usage into deeper projects
- supports structured, iterative work instead of single prompts
- produces richer assets that can later be shared or sold

Recommended monetization:

- student tier for light project work
- researcher tier for sustained advanced usage
- pro tier for higher limits, better exports, and collaboration depth

### 3. Agent Layer

Primary agent surfaces:

- Twin / Second Me
- Hermes-style personal agent behavior
- delegated tasks
- approval flows
- permissioned autonomous actions

Role in the platform:

- turns the product from a toolset into a collaborator
- enables human-in-the-loop delegation for research, writing, previews, and
  community participation
- creates a premium identity layer around personal agent ownership and trust

Recommended monetization:

- reserve for pro or premium add-on tiers
- meter by advanced actions, autonomous runs, or agent seats if needed later

### 4. Community And Channels

Primary community surfaces visible in the repo:

- `/community`
- `/explore`
- `/explore/channels`
- Twin forum and forum-post APIs
- notifications and voting components

Role in the platform:

- not just discussion, but asset discovery and feedback
- lets humans and agents participate in shared spaces
- improves reach, trust, engagement, and reuse of user-created assets
- provides an audience-building layer around creators and agent identities

Why it increases asset value:

- good assets become discoverable
- users receive feedback and social proof
- channels organize assets by topic and intent
- agents can preview, assist, and participate with permission

### 5. Marketplace And Store

Primary store surfaces visible in the repo:

- `/marketplace`
- `/books/[bookId]`
- wallet / credits components
- content sales cards
- user library

Role in the platform:

- turns user-created assets into commercial products
- supports internal purchase, ownership, earnings, and repeat discovery
- makes monetization native to the product rather than an external add-on

Observed commercial pattern in the repo:

- users purchase with credits
- creators earn from sales
- readers keep owned content in a library
- the platform takes a share of transactions

### 6. Book Writing To Publishing

Primary publishing surfaces visible in the repo:

- manuscript APIs
- export and validation APIs
- publishing and distribution routes
- community preview flow for books
- marketplace and internal book pages

Role in the platform:

- the most complete end-to-end asset workflow in the repo
- combines creation, review, collaboration, preview, distribution, and sales
- demonstrates the full creator economy loop inside the product

Recommended monetization:

- high-value paid workflow
- researcher tier for writing studio depth
- pro or creator-pro tier for full distribution and sales capabilities

## Human And Agent Collaboration Model

The product should be treated as a **co-creation system**, not just an AI
generation system.

Typical interaction loop:

1. human provides intent, source material, or direction
2. agent drafts, transforms, or expands the work
3. human reviews, edits, and approves
4. agent prepares the asset for community, channel, or publishing use
5. the asset is shared, sold, or distributed

This collaboration model is visible in:

- Twin task execution and approvals
- book quality checks and community preview routes
- forum posting and reaction endpoints for agents
- workspace-style UIs where assets evolve over time

## Community, Channels, And Collaboration

The repo supports a model where **humans and agents can interact around shared
assets**, not just private tool outputs.

Community function in product terms:

- humans create and own assets
- agents help produce, summarize, preview, or publish those assets
- community spaces allow visibility and discussion
- channels group assets by interest, domain, or creator relevance
- notifications and voting create engagement loops
- successful assets can feed into book sales, creator reputation, and audience
  growth

This means community should be treated as a **distribution and reputation
layer**, not a standalone social feature.

## Monetization Model

Use this as the revised monetization baseline:

### Subscriptions

Charge for:

- creation capacity
- workspace depth
- quality levels
- saved history and collaboration scale
- advanced exports
- agent access and autonomy controls

### Credits

Use credits for:

- marketplace purchases
- gifting and audience support
- premium asset unlocks
- selected high-cost generation or publishing actions if needed

### Creator earnings

Use creator earnings for:

- internal book and content sales
- community-to-store conversion
- incentive alignment between platform growth and creator output

### Premium agent layer

Reserve for higher tiers:

- Twin / Second Me
- Hermes-style autonomous collaboration
- approval-controlled community and publishing actions

## Target-State Architecture Note

The **business model** above is valid now, but the **backend implementation**
is still mid-transition.

Current repo reality:

- several community, marketplace, publishing, and Twin flows are still wired to
  Convex
- the app is actively migrating toward InsForge as the long-term system of
  record

Target state:

- InsForge should become the primary backend for auth, ownership, storage, and
  durable application data
- the remaining Convex-backed community, marketplace, Twin, and publishing
  flows should be migrated in phases instead of being treated as permanent
  architecture

This should guide planning:

- keep product strategy asset-centric
- keep infrastructure strategy InsForge-centric
- avoid introducing new long-lived Convex dependencies while the migration is
  underway

## Strategic Conclusion

Shothik should be planned as a connected platform with six reinforcing layers:

1. legacy writing suite
2. workspaces
3. agent layer
4. community and channels
5. marketplace and store
6. publishing and distribution

That model better matches the repo, the monetization surfaces, and the long-term
value of user-created assets than a simple "AI writing tools" framing.
