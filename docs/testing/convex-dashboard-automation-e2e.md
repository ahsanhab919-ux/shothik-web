# Convex Dashboard Automation (End-to-End)

## Goal

Provide a fully automated, repeatable browser workflow that follows the Convex Dashboard inspection steps in:

- `docs/testing/convex-dashboard-browser-automation-workflow.md#L21-43`

The automation is designed to run without manual intervention once a valid authenticated storage state is provided.

## What This Automation Does

The workflow:

1. Opens the Convex dashboard base URL
2. Verifies the session is authenticated (fails fast if not)
3. Opens the target deployment by slug (`team/project/deployment`)
4. Opens General settings and validates the Cloud URL matches the expected deployment URL
5. Opens Environment Variables and records visible variable names only
6. Opens Authentication and records whether providers are configured
7. Opens the `*.convex.cloud` endpoint and validates it returns the expected "deployment is running" content
8. Captures screenshots at each step
9. Writes structured JSONL logs and a JSON summary per browser run

## Security / Permissions Model

The workflow is read-only by default:

- It does not click "Add", "Create Deploy Key", or enable authentication providers.
- It does not write any environment variable values.
- It only records environment-variable names that are visible in the dashboard UI.

## Required Configuration

### Required Environment Variables

- `CONVEX_TEAM_SLUG` (example: `ahsan-habib-72ce3`)
- `CONVEX_PROJECT_SLUG` (example: `shothik`)
- `CONVEX_DEPLOYMENT_SLUG` (example: `dashing-mandrill-233`)
- `CONVEX_EXPECTED_CLOUD_URL` (example: `https://dashing-mandrill-233.convex.cloud`)
- `CONVEX_STORAGE_STATE_PATH` path to a Playwright storage state JSON file that is already authenticated for `https://dashboard.convex.dev`

### Optional

- `CONVEX_EXPECTED_HTTP_ACTIONS_URL` (example: `https://dashing-mandrill-233.convex.site`)
- `CONVEX_DASHBOARD_BASE_URL` (default: `https://dashboard.convex.dev`)
- `CONVEX_WORKFLOW_OUTPUT_DIR` (default: `test-results/convex-dashboard-workflow`)
- `CONVEX_HEADLESS` (default: `true`)
- `CONVEX_WORKFLOW_VERBOSE` (default: `false`)
- `CONVEX_RETRIES_PER_STEP` (default: `2`)
- `CONVEX_STEP_TIMEOUT_MS` (default: `30000`)

## How To Run

### 1. Capture Auth State Once

Run this headed bootstrap command and complete the Convex login flow manually once:

```bash
pnpm auth:convex:capture-state
```

By default it writes the authenticated Playwright storage state to:

```bash
test-results/convex-dashboard-auth/storage-state.json
```

You can override the location:

```bash
CONVEX_STORAGE_STATE_PATH="/absolute/path/to/convex-storage-state.json" pnpm auth:convex:capture-state
```

### 2. Run The Automated Workflow

Run the matrix workflow across Chromium, Firefox, and WebKit:

```bash
pnpm test:convex:dashboard-workflow
```

Or run the Playwright test form (uses existing Playwright projects):

```bash
pnpm exec playwright test e2e/convex-dashboard-workflow.spec.ts
```

## Example Configuration (This Deployment)

```bash
export CONVEX_TEAM_SLUG="ahsan-habib-72ce3"
export CONVEX_PROJECT_SLUG="shothik"
export CONVEX_DEPLOYMENT_SLUG="dashing-mandrill-233"
export CONVEX_EXPECTED_CLOUD_URL="https://dashing-mandrill-233.convex.cloud"
export CONVEX_EXPECTED_HTTP_ACTIONS_URL="https://dashing-mandrill-233.convex.site"
export CONVEX_STORAGE_STATE_PATH="$PWD/test-results/convex-dashboard-auth/storage-state.json"
```

## Outputs / Monitoring

Per run, the workflow writes:

- `test-results/convex-dashboard-workflow/<runId>/activity.jsonl`
  - step start/error/finish events
  - retry attempts and backoff
  - URL at failure time
- `test-results/convex-dashboard-workflow/<runId>/summary.json`
  - overall pass/fail, durations, extracted findings
- per-step screenshots

The runner prints a compact JSON summary to stdout for pipeline collection.

## Reliability Mechanisms

- Step-level retries with exponential backoff for transient browser/network failures
- Screenshot capture on success and on each retry/failure
- Validation gates at critical milestones (authentication, URL match, cloud endpoint health)

## Cross-Browser Coverage

The workflow runner explicitly executes against:

- Chromium
- Firefox
- WebKit

If a browser fails due to authentication/session incompatibility, the run fails with a clear error and captures evidence.

## Non-Interactive Authentication Note

Convex Dashboard auth typically uses OAuth/SSO flows. This workflow intentionally does not attempt to automate third-party OAuth.
Instead, it requires a pre-authenticated Playwright storage state to enable a reliable, non-interactive run.

Use `pnpm auth:convex:capture-state` once to create that storage state, then reuse it for all later automated runs.
