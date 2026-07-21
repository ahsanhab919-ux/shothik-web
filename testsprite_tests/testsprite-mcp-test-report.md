# TestSprite Verification Report

Date: 2026-07-16
Project: `shothik-web`
Execution mode: Local app at `http://localhost:3000` with TestSprite MCP runtime

## Environment Verification

- Cloud CLI authentication: configured successfully with the workspace-local TestSprite profile
- Account status: authenticated as `ahsanhab919@gmail.com`
- Available credits: `520`
- Granted scopes: `read:projects`, `read:tests`, `read:me`, `write:tests`, `run:tests`, `write:projects`
- CLI doctor result: passed all critical checks; only warning was optional agent-skill installation
- Runtime lock status: no active `testsprite_tests/tmp/execution.lock`

## npm and Runtime Verification

- `node`: `v26.5.0`
- `npm`: `11.17.0`
- `pnpm`: `11.10.0`
- `pnpm-lock.yaml`: present
- Playwright CLI: `1.59.1`
- `@playwright/test`: installed and usable
- Local app probe: `http://127.0.0.1:3000/` returned `200 OK`

## Resolved Issues

1. The global TestSprite CLI was installed and confirmed available as `testsprite 0.3.0`.
2. The CLI initially had no authenticated profile in this shell.
3. Authentication was resolved by running `testsprite setup --from-env --no-agent -y` against the workspace-local TestSprite home using the existing project API key.
4. The generated raw TestSprite report still contained placeholder analysis text, so this curated report was recreated from the final artifacts.

## Final Runtime Status

The latest six-case public smoke batch completed successfully. Final artifact sources:

- `testsprite_tests/tmp/test_results.json`
- `testsprite_tests/tmp/raw_report.md`
- `testsprite_tests/tmp/mcp.log`

Summary: `6 / 6 passed`

## Test Results

1. `TC004` Invalid sign-in feedback: Passed
   Evidence: invalid credentials keep the user in the auth flow and surface feedback instead of granting access.
2. `TC034` Public homepage load: Passed
   Evidence: the public marketing shell and navigation rendered successfully.
3. `TC035` Health endpoint: Passed
   Evidence: `/api/health` returned a healthy JSON response containing `status: "ok"`.
4. `TC036` Swagger JSON endpoint: Passed
   Evidence: `/api/docs/swagger.json` returned the expected protected response rather than crashing.
5. `TC037` Public paraphrase page: Passed
   Evidence: the paraphrase route loaded and exposed the expected editor/input surface.
6. `TC038` Dashboard compatibility redirect: Passed
   Evidence: `/dashboard` redirected into the current auth flow and avoided a 404.

## Residual Notes

- The TestSprite CLI is now authenticated locally, but the optional coding-agent skill was intentionally skipped during setup.
- The current verified batch covers public smoke and compatibility routes only; authenticated chat or signup flows were not part of this execution set.
