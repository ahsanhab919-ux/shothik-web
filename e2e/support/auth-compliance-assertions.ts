import { expect, type Locator, type Page } from "@playwright/test";

import { AUTH_COMPLIANCE_PATTERNS } from "@/lib/auth-compliance-patterns";

export async function expectAuthComplianceNotice(notice: Locator) {
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(AUTH_COMPLIANCE_PATTERNS.serviceProvider);
  await expect(notice).toContainText(AUTH_COMPLIANCE_PATTERNS.supportEmail);
}

export async function expectNoticeListItemToMatchPatterns(
  listItem: Locator,
  patterns: ReadonlyArray<RegExp>,
) {
  // Assert smaller regex fragments against one list item so disclosure copy can
  // evolve without breaking the entire test on punctuation or conjunction tweaks.
  await expect(listItem).toBeVisible();

  for (const pattern of patterns) {
    await expect(listItem).toContainText(pattern);
  }
}

export function getAuthNoticeListItem(notice: Locator, index: number) {
  return notice.getByRole("listitem").nth(index);
}

export function getAuthNoticeListItemByPattern(notice: Locator, pattern: RegExp) {
  return notice.getByRole("listitem").filter({ hasText: pattern });
}

export function getLoginComplianceNotice(page: Page) {
  return page.getByLabel(/login privacy notice/i);
}

export function getRegisterComplianceNotice(page: Page) {
  return page.getByLabel(/account creation privacy notice/i);
}

function getComplianceLink(notice: Locator, name: RegExp) {
  return notice.getByRole("link", { name });
}

export function getLoginPrivacyPolicyLink(page: Page) {
  return getComplianceLink(getLoginComplianceNotice(page), /privacy policy/i);
}

export function getLoginTermsLink(page: Page) {
  return getComplianceLink(getLoginComplianceNotice(page), /terms & conditions/i);
}

export function getLoginDeletionPolicyLink(page: Page) {
  return getComplianceLink(getLoginComplianceNotice(page), /data deletion policy/i);
}

export function getLoginSupportEmailLink(page: Page) {
  return getComplianceLink(getLoginComplianceNotice(page), /support@shothik\.ai/i);
}

export function getRegisterPrivacyPolicyLink(page: Page) {
  return getComplianceLink(getRegisterComplianceNotice(page), /privacy policy/i);
}

export function getRegisterTermsLink(page: Page) {
  return getComplianceLink(getRegisterComplianceNotice(page), /terms & conditions/i);
}

export function getRegisterDeletionPolicyLink(page: Page) {
  return getComplianceLink(getRegisterComplianceNotice(page), /data deletion policy/i);
}

export function getRegisterSupportEmailLink(page: Page) {
  return getComplianceLink(getRegisterComplianceNotice(page), /support@shothik\.ai/i);
}

export function getRegisterConsentCheckbox(page: Page) {
  return page.getByRole("checkbox", {
    name: AUTH_COMPLIANCE_PATTERNS.registerConsent,
  });
}

export function getRegisterNameField(page: Page) {
  return page.getByRole("textbox", { name: "Name" });
}

export function getRegisterEmailField(page: Page) {
  return page.getByRole("textbox", { name: "Email" });
}

export function getRegisterPasswordField(page: Page) {
  return page.getByLabel("Password", { exact: true });
}

export function getRegisterConfirmPasswordField(page: Page) {
  return page.getByLabel("Confirm Password", { exact: true });
}

export function getRegisterCreateAccountButton(page: Page) {
  return page.getByRole("button", { name: /create account/i });
}

export function getLoginEmailField(page: Page) {
  return page.getByRole("textbox", { name: "Email" });
}

export function getLoginPasswordField(page: Page) {
  return page.getByLabel("Password", { exact: true });
}

export function getRememberEmailCheckbox(page: Page) {
  return page.getByRole("checkbox", { name: AUTH_COMPLIANCE_PATTERNS.rememberEmail });
}

export function getForgotPasswordLink(page: Page) {
  return page.getByRole("link", { name: /forgot password\?/i });
}

export function getLoginSubmitButton(page: Page) {
  return page.getByRole("button", { name: /sign in and continue/i });
}

export function getAuthStatusMessage(page: Page) {
  return page.getByRole("status");
}

export function getAuthAlertMessage(page: Page) {
  return page.getByRole("alert").filter({ hasText: /\S/ }).first();
}

export function getVerifyEmailCodeField(page: Page) {
  return page.getByRole("textbox", { name: "Verification code" });
}

export function getVerifyEmailButton(page: Page) {
  return page.getByRole("button", { name: "Verify email" });
}

export function getResendVerificationCodeButton(page: Page) {
  return page.getByRole("button", { name: "Resend code" });
}

export function getForgotPasswordEmailField(page: Page) {
  return page.getByRole("textbox", { name: "Email address" });
}

export function getForgotPasswordRequestButton(page: Page) {
  return page.getByRole("button", { name: /send request|resend request/i });
}

export async function expectLoginComplianceNotice(page: Page) {
  const notice = getLoginComplianceNotice(page);
  await expectAuthComplianceNotice(notice);
  await expect(getAuthNoticeListItemByPattern(notice, AUTH_COMPLIANCE_PATTERNS.rememberEmail)).toBeVisible();
  await expect(getAuthNoticeListItemByPattern(notice, AUTH_COMPLIANCE_PATTERNS.thirdPartyGoogle)).toBeVisible();
  await expect(getAuthNoticeListItemByPattern(notice, AUTH_COMPLIANCE_PATTERNS.analyticsDisclosure)).toBeVisible();
}

export async function expectRegisterComplianceNotice(page: Page) {
  const notice = getRegisterComplianceNotice(page);
  await expectAuthComplianceNotice(notice);
  await expectNoticeListItemToMatchPatterns(
    getAuthNoticeListItemByPattern(notice, AUTH_COMPLIANCE_PATTERNS.accountDataFields),
    [
      AUTH_COMPLIANCE_PATTERNS.accountDataFields,
      AUTH_COMPLIANCE_PATTERNS.relatedSecurityEvents,
    ],
  );
  await expect(getAuthNoticeListItemByPattern(notice, AUTH_COMPLIANCE_PATTERNS.thirdPartyGoogle)).toBeVisible();
}
