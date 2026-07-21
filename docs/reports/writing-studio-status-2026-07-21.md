# Writing Studio Status - 2026-07-21

## Scope

- Verified browser-compatible WebMCP asset URL for local UI exposure.
- Enabled WebMCP explicitly in local environment configuration.
- Repaired the Writing Studio planner handoff so fresh project generation opens the editor reliably.
- Re-ran browser-driven Writing Studio regression across fresh project creation, save/load persistence, format mode, export paths, publish handoff, and staging auth access behavior.

## Environment Configuration

- `NEXT_PUBLIC_ENABLE_WEBMCP_WIDGET=true`
- `NEXT_PUBLIC_WEBMCP_SCRIPT_URL=https://webmcp.dev/src/webmcp.js`

## Verified Asset

- Official implementation site: `https://webmcp.dev/`
- Verified browser-loadable asset URL: `https://webmcp.dev/src/webmcp.js`
- Rejected broken URL: `https://webmcp.dev/webmcp.js` returns `404`

## Regression Results

### Pass

- WebMCP runtime availability
  - Script tag is injected with `https://webmcp.dev/src/webmcp.js`
  - `window.WebMCP` is now available as a function at runtime
  - The widget renders and registers the expected Writing Studio tools
- Fresh project bootstrap
  - Fresh Writing Studio entry flow successfully generates a plan and opens the editor
  - The previous `Cannot read properties of undefined (reading 'title')` crash no longer reproduces in the latest localhost browser run
- Save/load persistence
  - Added new QA content to an existing draft
  - Saved, reloaded project list, reopened the same project
  - Confirmed persisted content remained present
- Format mode
  - Write to Format transition works
  - Typography toggle responds
  - Citation style changes update helper copy immediately
- PDF export path
  - `POST /api/latex` completes successfully in direct API verification
  - `Export to PDF` completes without a blocking browser error in the latest localhost run
- Publish handoff
  - `Continue to Publish` opens the publish workflow
  - Active project title is carried into the publish surface
  - Upload gate and publish-step controls render as expected before manuscript upload

### Remaining Blockers

- Staging preview authorization
  - Smoke credentials authenticate successfully on `https://staging.shothikgpt.com`
  - The authenticated user is then blocked by the preview access gate before Writing Studio can load
  - This prevents authenticated staging certification of edit/save/format/publish flows with the current smoke account

## Reproduction

### Save/load persistence

1. Open `http://localhost:3000/writing-studio?projects=1`
2. Open project `WebMCP QA 2026-07-21T10:09:38`
3. Append `Third line for persistence QA GAMMA-20260721.` in the editor
4. Click `Save`
5. Reload `?projects=1`
6. Reopen the same project
7. Confirm the GAMMA line persists

### Format mode

1. Open the same project
2. Click `Format`
3. Click `Aa Sans`
4. Click `MLA`
5. Confirm helper text updates to `New citations will be formatted as MLA.`

### Export path

1. In `Format`, click `Export to PDF`
2. Observe the export trigger issue `POST /api/latex`
3. Confirm no blocking error toast appears
4. Confirm the action returns to a normal idle state after completion

### Publish handoff

1. In `Format`, click `Continue to Publish`
2. Confirm the Publishing Workflow screen loads
3. Confirm project title, stepper, upload area, and disabled continue state before upload

### Fresh project bootstrap

1. Open `http://localhost:3000/writing-studio`
2. Enter a prompt and click `Generate plan`
3. Confirm the generated plan transitions into the editor without the previous title crash

## Runtime Issues

- Staging smoke account lacks preview authorization after successful login, blocking authenticated staging workflow checks
- React hydration mismatch warnings still appear on Writing Studio loads in local dev
- `POST /api/auth/convex-token` may repeat during local route loads; observed as noise but not a blocking failure in the latest pass
- `GET /@vite/client` may abort in dev; likely non-blocking local-dev noise
- The WebMCP widget may warn that it is already initialized if the page is revisited in the same local browser session

## Current Assessment

- Localhost workflow is currently healthy for `plan -> write -> format -> export -> publish`
- Persistence for existing projects is healthy
- WebMCP is explicitly enabled in local env and operational at runtime
- The remaining blocker is staging preview access for the smoke account, not a newly reproduced localhost Writing Studio defect

## Recommended Next Actions

1. Grant preview access to the staging smoke account or provide a staging-authorized account for authenticated browser certification
2. Trace and reduce local Writing Studio hydration/token churn noise now that the core workflow is functional
3. Re-run the authenticated staging Writing Studio pass once preview authorization is resolved
