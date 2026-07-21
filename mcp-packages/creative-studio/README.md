# Shothik Creative Studio Package Scaffold

This directory contains the first repo-native packaging scaffold boundary for
the Shothik Creative Studio MCP slice.

Contents:

- `manifest.json`: versioned package manifest for future `sunpeak` packaging
- `fixtures/creative-studio-smoke.json`: dry-run and confirmation-gate workflow smoke checks
- `fixtures/creative-studio-confirmed-run.json`: confirmed execution response-contract fixture
- `fixtures/creative-studio-chatgpt-readiness.json`: ChatGPT host-readiness assertions
- `fixtures/creative-studio-claude-readiness.json`: Claude host-readiness assertions
- `runtime-evidence/chatgpt.json`: current ChatGPT host-runtime evidence or blocker state
- `runtime-evidence/claude.json`: current Claude host-runtime evidence or blocker state

This scaffold does not yet include:

- `sunpeak` runtime assets
- host-specific package bundles
- live inspector execution outputs
- host-runtime deployment wiring

The repo now includes a host-runtime validation module for comparing package
fixtures against observed host evidence, but live host execution and publishing
still belong to the next sequential packaging phase after this scaffold is
reviewed.
