# Login Validation Runner

This repo includes a dedicated Playwright runner for validating the production login flow with stable defaults and evidence capture.

## Default Run

```bash
pnpm test:e2e:login-validation
```

Defaults:
- base URL: `https://www.shothikgpt.com`
- browser project: `chrome-stable`
- repeat count: `1`
- mode: headless

## Successful Login Coverage

Provide an authorized smoke account to exercise the valid-login scenario.
The runner now auto-loads these values from the same local env files already
used by the project tooling, including:
- `.env.local`
- `.env.testsprite.local`

You can either store the credentials in one of those ignored local env files:

```bash
PLAYWRIGHT_SMOKE_EMAIL=authorized-user@yourdomain.com
PLAYWRIGHT_SMOKE_PASSWORD=strong-password
```

Or provide them inline for a single run:

```bash
PLAYWRIGHT_SMOKE_EMAIL='authorized-user@example.com' \
PLAYWRIGHT_SMOKE_PASSWORD='strong-password' \
pnpm test:e2e:login-validation -- --repeat-each 2
```

## Common Options

```bash
pnpm test:e2e:login-validation -- --headed
pnpm test:e2e:login-validation -- --browser firefox-stable
pnpm test:e2e:login-validation -- --browser chrome-stable,firefox-stable
pnpm test:e2e:login-validation -- --all-browsers
pnpm test:e2e:login-validation -- --base-url https://www.shothikgpt.com --repeat-each 2
```

`--all-browsers` runs the default supported matrix:
- `chrome-stable`
- `firefox-stable`
- `safari-webkit`

## Output

Artifacts are written to `test-results/` and include:
- screenshots for key states
- `login-validation-report.json`
- `login-validation-report.md`

Covered browser scenarios now include:
- login page load and critical element presence
- empty-field validation
- invalid-credential handling
- remembered email hydration from local device state
- remembered email opt-out clearing
- successful login, when smoke credentials are provided

## Notes

- If smoke credentials are omitted, the successful-login scenario is skipped intentionally.
- The remembered-email hydration and opt-out scenarios run without smoke credentials.
- The remembered-email persistence check is part of the successful-login scenario and therefore requires a real authorized account.
- Process env values still override local env-file values when both are present.
- Placeholder smoke credentials are rejected by the wrapper to avoid misleading runs.
- The runner forces `PLAYWRIGHT_HTML_OPEN=never` so execution can complete unattended.
