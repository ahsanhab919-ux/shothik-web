# Auth Compliance List-Item + Regex Standard

Date: `2026-07-19`

Scope: `Auth disclosure and sensitive auth-status assertions in browser tests`

## Purpose

This standard defines how to test privacy and compliance disclosure copy in the
auth experience without coupling tests to fragile sentence-level prose.

The approved approach is:

1. target the smallest meaningful list item or disclosure block
2. assert stable semantic fragments with regex patterns
3. centralize the patterns in one reusable module
4. reuse the same helper across Playwright tests

## Comparative Analysis

### Option A: Whole-block literal string assertions

Example:

```ts
await expect(notice).toContainText(
  "name, email address, password, country, and selected workflow intent",
);
```

Why this is weak:

- breaks on harmless editorial changes such as commas, conjunctions, or extra qualifiers
- hides which exact semantic requirement failed
- encourages duplicated disclosure copy across tests
- increases debug time because the failure only reports one long mismatch

### Option B: List-item plus regex assertions

Example:

```ts
await expectNoticeListItemToMatchPatterns(getAuthNoticeListItem(notice, 0), [
  AUTH_COMPLIANCE_PATTERNS.accountDataFields,
  AUTH_COMPLIANCE_PATTERNS.relatedSecurityEvents,
]);
```

Why this is preferred:

- asserts one semantic unit at a time
- tolerates non-breaking copy edits
- points directly to the failing disclosure item
- centralizes reusable compliance vocabulary
- reduces duplicated long-form text in test files

Decision:

- `Option B` is the required approach for auth compliance disclosure tests.

## Regex Pattern Rules

- Keep patterns semantic, not sentence-exact.
- Match required terms and order only where order is part of the requirement.
- Allow flexible whitespace with `\s*` around punctuation or line breaks.
- Separate core requirements from optional qualifiers.
- Prefer multiple small regex checks over one mega-regex.
- Anchor only when exact start/end matching is required. Most disclosure checks
  should remain substring-compatible.

## List-Item Structure Requirements

- Compliance disclosures must render as semantically grouped list items inside
  the notice block when multiple independent obligations are disclosed.
- Each list item should represent one compliance topic:
  - account data collected
  - purpose of use
  - local storage / remembered email
  - third-party sign-in
  - analytics and legal links
- Browser tests must target the specific list item rather than the entire
  notice whenever validating multi-clause copy.

## Implementation Workflow

1. Add or update regex patterns in `lib/auth-compliance-patterns.ts`
2. Add pattern tests in `lib/__tests__/auth-compliance-patterns.test.ts`
3. Use `getAuthNoticeListItem()` to isolate the relevant disclosure item
4. Use `expectNoticeListItemToMatchPatterns()` for semantic assertions
5. For auth status copy that carries privacy/security meaning, reuse the shared
   regex catalog instead of hard-coded status literals
5. Run:

```bash
pnpm exec vitest run lib/__tests__/auth-compliance-patterns.test.ts
pnpm exec playwright test e2e/auth-compliance.spec.ts --project=chrome-stable
pnpm lint:auth-compliance
```

## Inline Comment Standard

- Add a short comment only when a regex or helper behavior is non-obvious.
- Current approved comment location:
  - `e2e/support/auth-compliance-assertions.ts`
- Do not restate simple code. Explain why the regex/list-item split exists.

## Enforcement

- Shared patterns live in `lib/auth-compliance-patterns.ts`
- Shared Playwright helpers live in `e2e/support/auth-compliance-assertions.ts`
- `pnpm lint:auth-compliance` applies the dedicated ESLint 9 flat-config rule in
  `eslint.auth-compliance.config.mjs` that blocks the known brittle disclosure
  literals in `e2e/auth-compliance.spec.ts`

## Team Briefing

All contributors touching auth compliance tests should follow this checklist:

- do not paste long disclosure sentences directly into Playwright assertions
- do not paste long auth status messages directly into Playwright assertions when
  a shared semantic regex already exists
- prefer list-item locators over full notice locators for multi-clause content
- add new disclosure vocabulary to the shared regex catalog first
- add Vitest coverage for every new regex pattern
- update this document when the workflow changes

## Relevant Files

- `lib/auth-compliance-patterns.ts`
- `lib/__tests__/auth-compliance-patterns.test.ts`
- `e2e/support/auth-compliance-assertions.ts`
- `e2e/auth-compliance.spec.ts`
- `e2e/auth-email-flows.spec.ts`
- `e2e/login-validation.spec.ts`
- `e2e/smoke.spec.ts`
- `eslint.auth-compliance.config.mjs`
