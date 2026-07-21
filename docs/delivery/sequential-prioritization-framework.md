# Sequential Prioritization Framework

Date: `2026-07-18`
Status: `Active`
Applies to: `docs/shothik-phase2-projects-writing-plan.md`

## Objective

Advance migration and delivery work in strict sequence by always selecting the
highest-value ready task, fully completing it, validating it, documenting the
handoff, and only then ranking the next task.

## Decision Rules

1. Never start a second implementation slice while the current slice still has
   open completion criteria, missing validation, or undocumented handoff notes.
2. Only rank tasks that are unblocked and whose dependencies are already
   satisfied.
3. Prefer the task that removes the most risk from the active user path, not the
   task with the largest surface area.
4. Prefer bounded slices that can be validated with focused evidence over broad
   refactors that delay proof of correctness.
5. Re-run prioritization after every completed slice, blocker change, or new
   strategic directive.

## Value Metrics

Each candidate task is scored from `0` to `5` on each metric, then multiplied by
its weight. The highest total among dependency-ready tasks becomes the next
execution target.

| Metric | Weight | What it measures |
| --- | ---: | --- |
| Strategic alignment | 30 | Direct contribution to the active migration or release objective |
| User-path impact | 25 | Effect on the currently used creator/admin/reader path |
| Blocker reduction | 20 | How much the task unlocks later work or removes a hard dependency |
| Regression-risk reduction | 15 | How much legacy coupling, duplicated logic, or fragile behavior it removes |
| Validation readiness | 10 | How quickly the task can be proven complete with focused tests or runtime checks |

## Readiness Gate

A task is not eligible for scoring until all of the following are true:

- dependency inputs are present and verified
- required target files and replacement path are identified
- validation method is known in advance
- rollback or containment boundary is understood
- completion criteria can be written as observable outcomes

## Execution Lifecycle

### 1. Candidate capture

- list all plausible next tasks for the active workstream
- collapse duplicates and remove anything outside the approved plan

### 2. Readiness filter

- reject blocked or underspecified candidates
- reject tasks that depend on unfinished documentation or validation from the
  current slice

### 3. Weighted scoring

- score each remaining task against the five value metrics
- record why the top-ranked task wins, not just its numeric total

### 4. Completion contract

Before code or operational execution starts, define:

- exact scope boundary
- validation commands or probes
- success metrics
- handoff artifacts to update

### 5. Single-slice execution

- execute only the selected task
- fix directly related regressions discovered during execution
- defer unrelated improvements to the next ranking cycle

### 6. Validation gate

The slice is only complete when all required evidence exists:

- implementation matches the planned replacement direction
- focused regression checks pass
- diagnostics for touched files are clean or understood
- docs and status trackers are updated

### 7. Handoff and resequencing

- record what changed, what passed, and what remains
- identify the next dependency-ready candidates
- rescore and start the next task only after the current one is explicitly
  marked complete

## Completion Criteria Standard

Every active task must define completion using the same four checks:

1. Functional completion
   - the targeted behavior runs through the intended production path
2. Validation completion
   - the agreed checks pass and their outputs are captured
3. Documentation completion
   - the execution plan, progress log, and task-specific report reflect the new
     state
4. Handoff completion
   - the next candidate task, dependencies, and residual risks are stated

## Handoff Template

Use this structure at the end of every slice:

- Completed scope:
  - files, routes, services, or docs changed
- Value delivered:
  - which strategic goal moved forward
- Validation evidence:
  - commands, browser runs, or probes that passed
- Residual risk:
  - what still depends on legacy code or external input
- Next candidate ranking:
  - top ready task, why it ranks first, and what remains blocked

## Periodic Review Cadence

Run a prioritization review at these checkpoints:

- before starting any new task
- immediately after a slice passes validation
- when a blocker is removed or a new blocker appears
- when the strategic objective changes
- at the end of each focused work session so the next session can resume from a
  stable ranked state

## Current Application: Writing Studio Convex Removal

The first post-browser-gate ranking for the residual writing-studio Convex audit
produced this result:

| Candidate | Strategic alignment | User-path impact | Blocker reduction | Risk reduction | Validation readiness | Weighted result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Remove active editor-path Convex usage in `PolishedWriteView.tsx` and `CharacterPanel.tsx` | 5 | 5 | 4 | 5 | 5 | `4.85 / 5` |
| Remove legacy wrapper/container consumers in `IntegratedWritingStudio.tsx` and `ProjectContainer.tsx` | 4 | 3 | 4 | 4 | 3 | `3.70 / 5` |
| Remove publishing-surface Convex dependencies | 3 | 2 | 3 | 3 | 2 | `2.65 / 5` |
| Remove global Convex auth/runtime bridge | 3 | 2 | 5 | 4 | 1 | `2.90 / 5` |

Why the editor-path slice ranked first:

- it touched the live authoring path, not just compatibility wrappers
- it removed active Convex writes from character persistence and autosave-related
  editor flow
- it had clear acceptance evidence through type-check, lifecycle regression, and
  browser verification

## Current Completion Evidence

The active editor-path slice is complete only because all four checks were met:

- Functional completion:
  - `hooks/useProjectCharacters.ts` now persists character data through
    `project.settings.characters`
  - `components/writing-studio/PolishedWriteView.tsx` no longer uses
    `useConvexAutosave`
  - `hooks/useConvexAutosave.ts` was removed
- Validation completion:
  - `pnpm exec tsc --noEmit`
  - `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright test e2e/writing-studio-lifecycle.spec.ts --project=chrome-stable`
  - focused browser verification confirmed character persistence after reload
- Documentation completion:
  - residual Convex audit, progress log, execution plan, and TS7 evaluation are
    updated in this handoff batch
- Handoff completion:
  - after the shell-container slice closed, the next candidate ranking moved to
    publish-side writing-studio consumers

## Next Ready Candidate

After the final global bridge slice completed, the next highest-value ready
step is:

- final regression, config cleanup, and technical-document alignment
- formal Phase 4 closeout and next-phase handoff publication

Reason:

- the active writing-studio Convex migration lane is now technically complete,
  so the remaining work is validation, cleanup, and formal phase closeout
- sequencing should now prevent new feature work from starting until the final
  regression and documentation gates are satisfied
