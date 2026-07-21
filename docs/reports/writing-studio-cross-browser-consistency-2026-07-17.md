# Writing Studio Cross-Browser Consistency Report

Date: 2026-07-17
Scope: Pre-entry validation for the writing-studio project lifecycle
Workflows:
- Project creation
- Content saving
- Reopening saved projects
- Historical version restoration
- Project deletion

## Acceptance Status

Status: Accepted

Reason:
- The full lifecycle suite now passes across Chrome Stable, Firefox Stable, Safari-equivalent WebKit, and Edge Stable.
- All 5 required workflows passed in every target project with consistent storage verification and no functional discrepancies.
- The Convex-removal phase is now open.

## Compatibility Matrix

| Target browser | Validation target | Host/browser evidence | Status | Notes |
| --- | --- | --- | --- | --- |
| Chrome Stable | Real Chrome channel | `Google Chrome 150.0.7871.127` | Pass | Ran with the local Chrome channel through Playwright. |
| Firefox Stable | Playwright Firefox bundle | `firefox-1511` installed in `.playwright-browsers` | Pass | Bundle was installed manually from the official Playwright Firefox zip after installer extraction stalled. |
| Safari Stable | Playwright WebKit as Safari-equivalent automation target | `webkit-2272` installed in `.playwright-browsers` | Pass | Actual Safari WebDriver remained host-locked, so the suite used the standard WebKit Safari-equivalent automation target. |
| Edge Stable | Workspace-local Edge app bundle | `Microsoft Edge 150.0.4078.80` in `.browser-apps` | Pass | App bundle was installed manually from the official Microsoft Edge DMG and launched via explicit executable path. |

## Reproducible Test Asset

Automated suite:
- `pnpm test:e2e:writing-studio`
- Spec: `e2e/writing-studio-lifecycle.spec.ts`
- Config: `playwright.config.ts`
- Local browser assets:
  - `.playwright-browsers/`
  - `.browser-apps/Microsoft Edge.app`

Chrome execution command used in this validation:

```bash
pnpm exec playwright test e2e/writing-studio-lifecycle.spec.ts --project=chrome-stable
```

## Metrics

Evidence files:
- `test-results/writing-studio-lifecycle-w-8ea0f-nd-delete-remain-consistent-chrome-stable/writing-studio-lifecycle-metrics.json`
- `test-results/writing-studio-lifecycle-w-8ea0f-nd-delete-remain-consistent-firefox-stable/writing-studio-lifecycle-metrics.json`
- `test-results/writing-studio-lifecycle-w-8ea0f-nd-delete-remain-consistent-safari-webkit/writing-studio-lifecycle-metrics.json`
- `test-results/writing-studio-lifecycle-w-8ea0f-nd-delete-remain-consistent-edge-stable/writing-studio-lifecycle-metrics.json`

| Browser | Create | Save | Reopen | Restore | Delete |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chrome Stable | 2046ms | 68ms | 345ms | 244ms | 686ms |
| Firefox Stable | 2282ms | 64ms | 396ms | 289ms | 742ms |
| Safari-equivalent WebKit | 2148ms | 50ms | 297ms | 246ms | 618ms |
| Edge Stable | 1829ms | 65ms | 318ms | 237ms | 653ms |

Functional availability:
- `100%` across all 5 workflows in all 4 browser targets.

Data consistency:
- `100%` across all 5 workflows in all 4 browser targets.

Observed storage consistency in every passing run:
- Project draft persisted in `shothik_writing_projects`
- Version history persisted in `shothik_project_versions`
- Route-level reopen restored the saved draft correctly
- Historical restore reverted the draft and created a restore snapshot
- Delete removed both the project and its local version history

## Discrepancies Fixed

The following issues were identified and resolved during the browser gate preparation:

1. Convex-provider crash on entry
   - `components/partials/header/LanguageSwitcher/index.tsx`
   - Fixed the language switcher so it no longer calls Convex-backed sync logic when Convex is not configured in the environment.

2. Writing-studio autosave crash in non-Convex environments
   - `hooks/useConvexAutosave.ts`
   - Added a safe no-op path so local-mode editing works without a Convex client.

3. Inaccessible project-card interactions
   - `components/tools/writing-studio/dashboard/WritingHomeDashboard.jsx`
   - Added keyboard/button semantics and stable selectors for project cards, and made the options trigger consistently available.

4. Local delete left orphaned version history
   - `lib/projects-store.js`
   - Delete now also removes the project's local version records.

5. Onboarding tour blocked save interactions
   - `components/writing-studio/PolishedWriteOnboarding.tsx`
   - Changed the tour from auto-launch to manual launch so the overlay cannot intercept core editor actions.

6. Missing route/test coverage for the lifecycle itself
   - `e2e/writing-studio-lifecycle.spec.ts`
   - Added a reproducible Playwright lifecycle spec that validates create, save, reopen, restore, and delete with latency and storage checks.

## Remaining Blockers

1. Actual Safari host automation remains disabled
   - `safaridriver` is present, but enabling Safari’s native “Allow remote automation” setting requires an interactive host change that this environment cannot make unattended.
   - The accepted automation target for this gate is Playwright WebKit, which passed fully.

2. Browser asset locality
   - Firefox and WebKit are installed in `.playwright-browsers`.
   - Edge is installed in `.browser-apps/Microsoft Edge.app`.
   - Keep these assets available on the runner when repeating the suite.

## Gate Decision

Decision: Pass

Next development phase status:
- Residual writing-studio Convex dependency audit: In progress
- Generalized abstraction replacement: Ready to start from audited inventory
- Full regression after Convex removal: Not started
- Dependency/config/document cleanup for deprecated Convex entries: Not started
