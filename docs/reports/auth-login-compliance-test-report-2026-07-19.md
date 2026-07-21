# Auth/Login Compliance Test Report

Date: `2026-07-19`

Scope: `Auth/login disclosure phase`

## Executed Validation

### 1. Interface Compliance Regression Tests

Command:

```bash
pnpm exec vitest run \
  app/auth/login/__tests__/page.test.tsx \
  app/auth/register/__tests__/page.test.tsx \
  app/api/auth/sign-in/route.test.ts \
  app/api/auth/sign-up/route.test.ts \
  app/api/auth/forgot-password/route.test.ts \
  app/api/auth/send-verify-email/route.test.ts \
  app/api/auth/verify-email/route.test.ts \
  app/api/auth/reset-password/route.test.ts
```

Outcome:

- Exit code: `0`
- Result: all executed regression checks passed

Coverage:

- login disclosure notice rendering
- register disclosure notice rendering
- legal-link presence on auth surfaces
- consent-link presence on registration
- auth API compliance hardening remained green after UI/policy alignment changes

### 2. Cross-Browser Auth Compliance Validation

Command:

```bash
pnpm exec playwright test e2e/auth-compliance.spec.ts --project=chrome-stable --project=firefox-stable
```

Outcome:

- Exit code: `0`
- Result: all executed browser compliance checks passed on both configured browser projects

Coverage:

- login-page provider, rights, storage, and legal disclosures
- register-page provider, purpose, and consent disclosures
- cross-browser validation on `chrome-stable` and `firefox-stable`

## Test Scenarios Verified

| Scenario | Validation Type | Status |
| --- | --- | --- |
| Login UI shows service provider, rights contact, and legal links | React Testing Library + Playwright | Pass |
| Login UI discloses remembered-email browser storage | React Testing Library + Playwright | Pass |
| Login UI discloses third-party sign-in processing | React Testing Library + Playwright | Pass |
| Register UI shows service provider, purposes, and legal links | React Testing Library + Playwright | Pass |
| Register consent text links to legal documents | React Testing Library + Playwright | Pass |
| Prior auth compliance route hardening remains intact | Route-level Vitest suite | Pass |

## Internal Review Outcome

- Disclosure implementation is consistent across login and registration.
- Privacy-policy alignment is traceable through the dedicated alignment report.
- No failures were observed in the executed compliance validation suite for this phase.

## Linked Deliverables

- `components/auth/AuthComplianceNotice.tsx`
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `app/(secondary-layout)/privacy/page.jsx`
- `e2e/auth-compliance.spec.ts`
- `docs/reports/auth-login-privacy-alignment-2026-07-19.md`
