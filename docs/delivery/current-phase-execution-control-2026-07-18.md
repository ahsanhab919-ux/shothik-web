# Current Phase Execution Control

Date: `2026-07-18`
Phase: `Phase 4 - Projects And Writing Persistence`
Status: `Closed`
Scope: close the remaining project-specific Convex dependencies for the
writing-studio lane, complete regression and documentation cleanup, and prepare
formal phase closeout.

## 1. Outstanding Items

| ID | Task | Priority | Status | Upstream dependencies | Downstream dependencies | Completion standard |
| --- | --- | --- | --- | --- | --- | --- |
| P4-01 | Migrate backend compatibility bridge consumers in `app/api/writing-studio/notify-master/route.ts`, `lib/writing-studio/buildStore.ts`, and `app/api/latex/status/[buildId]/route.ts` | Critical | Completed | editor, shell, publish-state, and earnings slices completed; browser parity gate passed; residual audit completed | unlocks global Convex auth/runtime bridge removal | target files no longer depend on project-specific Convex APIs and pass focused validation |
| P4-02 | Run focused validation and documentation sync for the backend bridge slice | High | Completed | `P4-01` complete | unlocks `P4-03` by proving the bridge slice is stable | focused tests, type-check, residual grep, and delivery-doc updates completed |
| P4-03 | Remove final global Convex auth/runtime bridge in `app/api/auth/convex-token/route.ts`, `lib/convex-auth.ts`, `app/api/.well-known/jwks.json/route.ts`, and `providers/ConvexClientProvider.jsx` | Critical | Completed | `P4-01` and `P4-02` complete; no residual frontend/backend Convex consumers remain in the active lane | unlocks final phase regression, dependency cleanup, and phase closure | global bridge files are deleted or reduced to no-op safe replacements, and runtime behavior stays intact |
| P4-04 | Execute final phase regression, dependency/config cleanup, and technical-document alignment | High | Completed | `P4-03` complete | unlocked `P4-05` phase signoff and handoff | focused and repo-level validation passed; config and docs reflect the post-Convex state |
| P4-05 | Publish formal Phase 4 closeout and next-phase handoff package | Medium | Completed | `P4-04` complete; validation evidence captured | unlocks transition to the next roadmap phase without re-planning the current lane | closeout report, next-phase roadmap, residual risks, and required cross-functional resources are recorded |

## 2. Dependency Map

### Upstream dependencies already satisfied

- cross-browser writing-studio lifecycle validation completed
- residual project-specific Convex inventory completed and ranked
- editor-path Convex removal completed
- legacy shell/container Convex removal completed
- publish-state Convex removal completed
- publish-earnings Convex removal completed

### In-phase execution chain

1. `P4-01` backend bridge migration
2. `P4-02` focused validation and doc sync
3. `P4-03` final global Convex runtime bridge cleanup
4. `P4-04` final regression and cleanup
5. `P4-05` phase closeout and handoff
6. phase closed; return to the broader roadmap

### Downstream program impact

- completing `P4-01` through `P4-05` removes the last active blockers to
  full writing-studio Convex retirement
- closing Phase 4 reduces migration risk before the higher-priority production
  rollout and governance workstreams take the next execution slot
- clean phase closure also lowers uncertainty for the MCP platform lane by
  removing unrelated migration noise from repo-wide validation

## 3. Execution Timeline

All dates below are target deadlines aligned to the current baseline so the
active phase can close without slipping the broader delivery roadmap.

| Milestone | Target deadline | Scope | Exit criteria |
| --- | --- | --- | --- |
| M0 | `2026-07-18` | lock outstanding-item list, dependency map, and execution controls | current phase scope, priorities, owners, and sync cadence are documented |
| M1 | `2026-07-18` | confirm backend bridge replacement contract and file-level implementation plan | `P4-01` boundary is frozen and no missing dependency inputs remain |
| M2 | `2026-07-19` | complete backend compatibility bridge migration | target bridge files no longer depend on project-specific Convex APIs |
| M3 | `2026-07-19` | complete focused validation and documentation sync for bridge slice | focused tests, type-check, grep, and updated delivery docs exist |
| M4 | `2026-07-20` | remove the final global Convex auth/runtime bridge | global bridge files are removed or retired without runtime regression |
| M5 | `2026-07-21` | complete final regression, config cleanup, and phase documentation alignment | phase validation evidence is complete and config/docs are consistent |
| M6 | `2026-07-21` | publish Phase 4 closeout and next-phase handoff | closeout report, next-phase roadmap, and resource asks are issued |

## 4. Daily Progress Synchronization Mechanism

### Daily cadence

| Checkpoint | Time | Format | Required outputs |
| --- | --- | --- | --- |
| Daily control sync | `09:30` local project time | 15-minute structured review | yesterday completed, today planned, current blocker state, milestone forecast |
| Midday risk sync | `13:30` local project time | async written update in delivery artifacts | risk movement, dependency changes, validation results, escalation need |
| End-of-day close sync | `18:00` local project time | 10-minute closeout review | completed evidence links, remaining tasks, next-day starting state |

### Mandatory update fields

Every sync entry must capture:

- task ID and current status
- completed outputs since the last sync
- next execution step before the next sync
- blocker or risk state with owner
- validation evidence produced or missing
- milestone forecast: `on_track`, `at_risk`, or `off_track`

### Required artifact updates

- update `docs/delivery/current-progress-log.md` once per day with material progress
- update `docs/delivery/current-milestones.md` when a milestone changes status
- update the task-specific phase doc when scope, dependencies, or validation
  strategy changes
- attach evidence links or command outputs to the relevant tracker issue when a
  gate is completed

### Escalation rules

- escalate any critical blocker within `2` working hours if it prevents the
  active task from progressing
- escalate any external dependency that remains unresolved for `1` business day
- trigger a milestone review immediately if any task slips by more than `1`
  target day
- do not start a lower-priority task to fill time while a critical blocker is
  unresolved unless the workaround is explicitly documented as non-disruptive

## 5. Risk And Blocker Register

| ID | Risk / blocker | Severity | Current state | Owner | Mitigation |
| --- | --- | --- | --- | --- | --- |
| R1 | backend bridge migration may expose hidden Convex fallback paths not captured in the last audit | High | Closed | engineering owner | resolved by targeted grep expansion and bridge-slice migration completion |
| R2 | global bridge cleanup may affect routes or providers still indirectly coupled to `ConvexClientProvider` | High | Closed | engineering owner | resolved by migrating the hidden export, twin-auth, and locale callers before retiring the bridge |
| R3 | external authenticated TestSprite credentials remain unavailable for broader staged smoke coverage | Medium | Open | platform / QA owner | keep this tracked as a cross-program blocker, but do not let it stall current in-phase code migration work |
| R4 | production rollout remains operationally sensitive and can disrupt sequencing if pulled forward unexpectedly | Medium | Open | release owner | keep Phase 4 scoped and documented so it can pause/resume cleanly if a P0 production directive supersedes it |

## 6. Baseline Timeline Alignment

This control package kept the active phase within a four-day closure window
from `2026-07-18` through `2026-07-21`.

Why this remains on baseline:

- the highest-risk user-facing publish work is already completed
- the remaining work is bounded to bridge and cleanup surfaces
- the validation method is already known from the previous slices
- daily sync checkpoints reduce the risk of silent drift or undocumented blockers

The phase closed without requiring a milestone slip response.
