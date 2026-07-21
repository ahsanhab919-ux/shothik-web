# Auth Semantic Locator Standard

## Purpose

This standard defines the shared semantic locator system for authentication browser suites.
It replaces generic label matching and page-local selector duplication with centralized,
role-aware helper functions in `e2e/support/auth-compliance-assertions.ts`.

## Why This Standard Exists

Generic selectors such as `page.getByLabel("Email")` become brittle when auth screens add
new controls whose accessible names reuse the same token. In this codebase, the login form
and the `Remember email on this device` checkbox can both satisfy broad label queries.

The semantic locator system improves stability by:

- targeting the correct control role instead of a raw text fragment,
- scoping legal-link assertions to the compliance notice instead of the full page,
- centralizing selector logic so auth suites inherit the same behavior,
- reducing maintenance churn when disclosure copy evolves.

## Core Rules

1. Prefer shared helpers from `e2e/support/auth-compliance-assertions.ts`.
2. Prefer role-based locators over free-form text or generic labels.
3. Scope duplicated legal links to the auth compliance notice.
4. Assert semantic outcomes, not incidental wording or DOM shape.
5. Add new auth-surface selectors to the shared helper file before using them in a suite.

## Shared Locator Contract

The shared helper module is the source of truth for auth selectors.

Current semantic groups:

- Login form:
  `getLoginEmailField()`, `getLoginPasswordField()`, `getLoginSubmitButton()`,
  `getRememberEmailCheckbox()`, `getForgotPasswordLink()`
- Register form:
  `getRegisterNameField()`, `getRegisterEmailField()`,
  `getRegisterPasswordField()`, `getRegisterConfirmPasswordField()`,
  `getRegisterCreateAccountButton()`, `getRegisterConsentCheckbox()`
- Verification and recovery:
  `getVerifyEmailCodeField()`, `getVerifyEmailButton()`,
  `getResendVerificationCodeButton()`, `getForgotPasswordEmailField()`,
  `getForgotPasswordRequestButton()`
- Shared feedback:
  `getAuthStatusMessage()`, `getAuthAlertMessage()`
- Compliance notice links:
  `getLoginPrivacyPolicyLink()`, `getLoginTermsLink()`,
  `getLoginDeletionPolicyLink()`, `getLoginSupportEmailLink()`,
  `getRegisterPrivacyPolicyLink()`, `getRegisterTermsLink()`,
  `getRegisterDeletionPolicyLink()`, `getRegisterSupportEmailLink()`

## Migration Pattern

Prefer this:

```ts
await expect(getLoginEmailField(page)).toHaveValue(expectedEmail);
await getForgotPasswordRequestButton(page).click();
await expect(getRegisterPrivacyPolicyLink(page)).toHaveAttribute("href", "/privacy");
```

Avoid this:

```ts
await expect(page.getByLabel("Email")).toHaveValue(expectedEmail);
await page.getByRole("button", { name: /Send Request|Resend Request/i }).click();
await expect(page.getByRole("link", { name: /Privacy Policy/i }).first()).toHaveAttribute("href", "/privacy");
```

## Maintenance Guidance

- If a selector becomes ambiguous, fix the shared helper instead of patching each suite.
- If a new auth control is added, extend the helper file and refactor consumers to use it.
- If disclosure copy changes, keep regex/text expectations isolated from control locators.
- If a page contains multiple equivalent legal links, use notice-scoped helpers to avoid `.first()`.

## Adoption Scope

This standard is applied to the auth-facing browser suites:

- `e2e/auth-compliance.spec.ts`
- `e2e/auth-email-flows.spec.ts`
- `e2e/login-validation.spec.ts`
- `e2e/smoke.spec.ts`

Future auth suites should adopt the same shared helper contract instead of defining local selectors.
