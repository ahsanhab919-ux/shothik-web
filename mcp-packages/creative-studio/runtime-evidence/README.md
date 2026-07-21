# Creative Studio Host Runtime Evidence

This directory stores the first deterministic host-runtime evidence artifacts for
the `shothik-creative-studio` package.

Rules:

- one JSON file per declared host target
- use the evidence shape validated by
  `scripts/validate-creative-studio-host-runtime-evidence.ts`
- set `collectionStatus` to `captured` only when real runtime observations have
  been collected for the declared workflow scenarios
- use blocker states such as `pending_authentication` or
  `pending_package_runtime` when host validation cannot yet be completed

Current files:

- `chatgpt.json`
- `claude.json`

Current known blocker:

- both hosts are reachable in the current browser context, but neither host has
  an authenticated session available for Creative Studio runtime observation
  collection
