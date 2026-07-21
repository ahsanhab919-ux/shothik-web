# Auth Compliance Maintainability Audit

Date: `2026-07-19`

Scope: `e2e/auth-compliance.spec.ts`, `e2e/auth-email-flows.spec.ts`, `e2e/login-validation.spec.ts`, `e2e/smoke.spec.ts`, and supporting auth compliance assertion modules

## Summary

The auth compliance suite now uses a list-item plus regex assertion standard
instead of direct whole-notice literal checks.

This change improves maintainability by moving brittle disclosure copy out of
browser assertions and into a shared pattern catalog with unit coverage.

## Comparative Outcome

| Metric | Before | After | Outcome |
| --- | --- | --- | --- |
| Long-form disclosure/status literals in auth-facing browser suites | suite-local brittle literals | shared semantic patterns across 4 suites | Improved |
| Shared assertion helper reuse | 0 helpers | helper layer reused by compliance, email-flow, login-validation, and smoke suites | Improved |
| Regex unit coverage | 0 | 7 focused Vitest cases | Improved |
| Lint enforcement for brittle disclosure literals | none | targeted rule in `eslint.auth-compliance.config.mjs` across 4 suites | Improved |
| Failure localization | whole notice block or full sentence mismatch | specific list item, labeled control, or semantic pattern | Improved |

## Debuggability Assessment

Before:

- failures reported mismatches against large notice blocks
- root cause was ambiguous when only punctuation or conjunctions changed

After:

- failures identify the exact list item being validated
- each assertion maps to one compliance requirement or fragment
- regex catalog makes intended semantics visible in one place

## Duplication Assessment

- Direct long disclosure prose and sensitive auth-status literals across the
  auth-facing browser suites were replaced
  with references to:
  - `AUTH_COMPLIANCE_PATTERNS`
  - `expectAuthComplianceNotice()`
  - `expectLoginComplianceNotice()`
  - `expectRegisterComplianceNotice()`
  - `expectNoticeListItemToMatchPatterns()`
  - field and consent helpers in `e2e/support/auth-compliance-assertions.ts`
- This reduces duplicated compliance vocabulary and keeps future wording changes
  localized.

## Onboarding Assessment

Expected onboarding improvement:

- new contributors now read one standards doc and one pattern module instead of
  reverse-engineering brittle prose assertions from a failing spec
- the implementation workflow is documented step-by-step in:
  - `docs/testing/auth-compliance-list-item-regex-standard.md`

## Remaining Limits

- The lint rule currently targets the known brittle auth-compliance literals and
  is intentionally narrow to avoid false positives in unrelated tests.
- If this pattern expands to more suites, the linting strategy should be lifted
  into a broader shared rule set or custom ESLint plugin.

## Audit Conclusion

- Reduced code duplication: `Yes`
- Improved debuggability: `Yes`
- Lowered onboarding time: `Yes, by centralizing patterns and workflow`
- Recommended as the standard for future auth compliance disclosure assertions:
  `Yes`
