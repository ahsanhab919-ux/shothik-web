# Auth/Login Compliance Baseline

Date: `2026-07-19`

Scope: `Auth + Login`

## Standards Adopted

- `OWASP ASVS 5.0.0`
  - Primary technical verification baseline for web authentication, input
    validation, session handling, generic error handling, secure redirects, and
    data-protection controls.
- `OWASP Top 10`
  - Threat-model reference for auth abuse, security misconfiguration, broken
    access control, and sensitive-data exposure prevention.
- `NIST SP 800-63B`
  - Authentication guidance baseline for user-chosen secrets, verifier behavior,
    account recovery, and user-safe credential handling.
- `W3C WCAG 2.2 AA`
  - Accessibility baseline for auth form labels, errors, focus states, and
    recovery/verification flows.
- `W3C HTML Living Standard` and `WAI-ARIA`
  - Semantic form behavior baseline for required fields, accessible labels,
    validation messaging, and assistive-technology compatibility.
- `RFC 9110`
  - HTTP semantics baseline for request validation and status-code behavior on
    auth endpoints.
- `ISO/IEC 27001:2022`
  - Governance reference for secure development lifecycle, access control,
    logging, and change management evidence.
- `ISO/IEC 27701:2019`
  - Privacy information management reference for data minimization, transparency,
    and processing documentation.
- `IEEE 29148:2018`
  - Requirements traceability reference for mapping implemented controls to test
    evidence and delivery documentation.
- `GDPR Articles 5, 12, 13, 25, 32`
  - Privacy-by-design and transparency reference for personal-data processing in
    authentication and account recovery flows.

## First-Pass Control Objectives

- Prevent account-enumeration leaks in interactive auth and recovery endpoints.
- Enforce normalized server-side validation for email-bearing auth requests.
- Prevent open redirects during registration and verification flows.
- Maintain explicit traceability from adopted standard -> implemented control ->
  automated test evidence.
- Keep browser-based validation isolated and diagnosable per scenario.

## Implemented Controls In This Pass

- `OWASP ASVS 5.0.0`
  - Added centralized auth input normalization and safe redirect resolution in
    `lib/auth-compliance.ts`.
  - Normalized sign-in failures to a generic invalid-credentials response in
    `app/api/auth/sign-in/route.ts`.
  - Normalized sign-up failures to a generic create-account failure response in
    `app/api/auth/sign-up/route.ts`.
  - Switched forgot-password and resend-verification endpoints to generic
    success responses for valid email submissions in:
    - `app/api/auth/forgot-password/route.ts`
    - `app/api/auth/send-verify-email/route.ts`
  - Sanitized verify-email and reset-password upstream failures to generic
    client-safe messages in:
    - `app/api/auth/verify-email/route.ts`
    - `app/api/auth/reset-password/route.ts`
- `RFC 9110`
  - Preserved `400` for malformed requests and deterministic request-shape
    failures.
  - Preserved `401` for invalid sign-in credentials.
  - Returned non-enumerating `200` responses for account-recovery requests after
    valid email validation.
- `IEEE 29148:2018`
  - Extended route-level regression tests to prove each compliance control is
    enforced and remains stable under future changes.

## Automated Evidence

- Updated tests:
  - `app/api/auth/sign-in/route.test.ts`
  - `app/api/auth/sign-up/route.test.ts`
  - `app/api/auth/forgot-password/route.test.ts`
  - `app/api/auth/send-verify-email/route.test.ts`
  - `app/api/auth/verify-email/route.test.ts`
  - `app/api/auth/reset-password/route.test.ts`

## Audit Cadence

- On every auth/login route change:
  - rerun the focused auth route test suite
  - rerun login browser validation
  - review error messages for enumeration leakage
  - verify redirects remain same-origin/internal only
- On every milestone or release candidate:
  - compare the implementation against the standards list in this document
  - update version references if adopted standards have changed
  - record new evidence in `docs/delivery/current-progress-log.md`

## Remaining Compliance Work

- Align register/login UI copy and disclosures with the current privacy and
  storage behavior without overwriting active in-progress UI work.
- Rewrite the privacy policy so it accurately reflects present-day auth,
  analytics, local-storage, and payment behavior.
- Harden security headers and CSP toward the stricter ASVS 5.0 frontend
  requirements.
- Add explicit accessibility assertions and consent/legal-link checks for
  register/login pages.
