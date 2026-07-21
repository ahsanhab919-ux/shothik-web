# TypeScript 7 Evaluation

Date: `2026-07-18`
Status: `Research complete`
Scope: repo-specific evaluation for `shothik-web`

## Executive Summary

TypeScript 7 is a major performance release with a native Go-based compiler and
language server that Microsoft reports as typically `8x` to `12x` faster on
full builds, with lower aggregate memory usage and significantly faster editor
feedback. For a large Next.js codebase with many active migration surfaces like
this repo, those gains are strategically attractive.

However, TypeScript 7.0 is not yet a drop-in upgrade target for this repo. The
current workspace still resolves around `typescript@5.9.3`, and the lint/tool
stack in the lockfile is built around that version through
`@typescript-eslint@8.58.2`, `eslint-config-next@16.2.3`, and other packages
that currently resolve against the TypeScript 5.x line. The TypeScript 7.0
release also explicitly notes that `7.0` does not yet ship a stable
programmatic API, with `7.1` targeted for that gap.

Recommendation:

- do not upgrade this production repo to TypeScript 7 immediately
- track ecosystem readiness and re-evaluate once the lint/tool chain formally
  supports TypeScript 7 or once a controlled side-by-side pilot is justified
- keep TypeScript 7 on the roadmap because the performance upside is likely
  material for local type-checking, editor responsiveness, and CI timing

## Release Highlights

Key benefits called out by Microsoft in the `2026-07-08` TypeScript 7
announcement:

- native Go implementation of the compiler and language server
- shared-memory multithreading for parsing, checking, and emitting
- typical full-build speedups between `8x` and `12x`
- lower aggregate memory use during builds
- much faster editor startup, diagnostics, and find-all-references
- improved `--watch` responsiveness
- new scaling controls:
  - `--checkers`
  - `--builders`
  - `--singleThreaded`
- LSP-based editor integration for the new language server

## Why It Matters For This Repo

Potential repo-specific gains:

- faster `pnpm exec tsc --noEmit` during migration slices and review gates
- shorter feedback loops while touching large writing-studio and API surfaces
- better editor responsiveness in a mixed TS/JS app with many active modules
- lower CI wait time on type-heavy validation paths
- more room to keep focused validation frequent instead of batching risky
  changes together

This matters because the current project already uses type-check as a mandatory
gate for migration work, and the user has explicitly asked for strict
sequential execution with strong validation boundaries.

## Current Repo Constraint Snapshot

Observed local dependency state:

- `package.json` declares `typescript: ^5`
- `pnpm-lock.yaml` resolves the workspace to `typescript@5.9.3`
- `package.json` declares:
  - `@typescript-eslint/eslint-plugin: ^8.46.1`
  - `@typescript-eslint/parser: ^8.46.1`
- `pnpm-lock.yaml` currently resolves those toolchain packages as
  `@typescript-eslint@8.58.2` against `typescript@5.9.3`
- `eslint-config-next@16.2.3` is also resolved against the same TypeScript
  version line in the lockfile
- `prisma@7.4.0` and other build-time tooling in the lockfile are likewise
  linked against `typescript@5.9.3`

Implication:

- this repo is currently a TypeScript 5.9-centered workspace, not a repo that
  is already normalized on the transitional TypeScript 6 compatibility path

## Benefits

### 1. Faster local type-checks

The repo repeatedly runs `pnpm exec tsc --noEmit` as a required proof point
after migration slices. TypeScript 7 could materially reduce the cost of doing
that often, which supports the desired high-discipline sequential workflow.

### 2. Better editor performance

The writing-studio and auth migration surfaces are broad and interconnected.
Faster language-service startup, completion, reference lookup, and diagnostics
would reduce friction while tracing legacy-to-InsForge cutovers.

### 3. Better CI efficiency

If the repo eventually runs more repo-wide type gates in CI for migration and
release readiness, TypeScript 7 could cut queue time and improve feedback speed
for pull requests.

### 4. Scaling controls for larger workspaces

The new `--checkers` and `--builders` flags create room to tune performance for
machines with more cores, while `--singleThreaded` offers a fallback mode for
debugging or constrained environments.

## Risks And Adoption Barriers

### 1. TypeScript 7.0 API gap

Microsoft states that TypeScript 7.0 does not yet ship a stable programmatic
API. That is the largest adoption risk for tools that integrate directly with
the compiler rather than only invoking `tsc`.

### 2. Lint/tooling compatibility

This repo depends on `@typescript-eslint` and `eslint-config-next`, both of
which sit in the critical developer workflow. Even if `tsc` itself works,
linting or editor integrations can become unstable if their compatibility range
lags behind the compiler upgrade.

### 3. Transitional complexity

The official TypeScript 7 guidance recommends side-by-side operation with the
compatibility package `@typescript/typescript6` for tools that still need the
older API. This is viable for experimentation, but it adds package, script, and
team-tooling complexity that is not justified for the active migration lane
unless performance becomes a blocking issue.

### 4. Upgrade timing risk

The current highest-value engineering work is still backend and writing-studio
migration away from Convex. Introducing a compiler-stack change during that flow
would widen the regression surface at the wrong time.

## Recommendation

Decision: `Defer direct adoption for now`

Why:

- the benefits are real and likely large for this repo
- the current workspace is still built around TypeScript `5.9.3`
- the surrounding lint and build toolchain has not been validated here against
  TypeScript 7
- the active migration objective values stability over speculative tooling
  change

## Recommended Adoption Path

### Near term

- keep the production workspace on the current TypeScript 5.9 line
- do not change the compiler during the current writing-studio Convex-removal
  sequence
- monitor `@typescript-eslint`, Next.js, Prisma, and any compiler-integrated
  tooling for formal TypeScript 7 support guidance

### Pilot path once ecosystem support improves

- create an isolated benchmark branch
- compare:
  - current `pnpm exec tsc --noEmit`
  - TypeScript 7 native `tsc`
  - lint and editor behavior
- only consider rollout if:
  - `tsc` is stable
  - linting remains reliable
  - Next.js build/dev workflows remain green
  - validation timings show material benefit

### Transitional option if speed becomes urgent before full compatibility lands

- evaluate the official side-by-side approach rather than a full replacement
- keep the older compatibility package for tooling that still expects the
  programmatic API
- reserve this for a controlled experiment, not the main branch by default

## Final Position

TypeScript 7 is worth tracking and likely worth adopting later, but it is not
the next highest-value change for this repo today. The correct immediate move is
to finish the current migration sequence, keep the validation loop stable, and
return to a benchmarked TypeScript 7 pilot once the surrounding toolchain is
ready.
