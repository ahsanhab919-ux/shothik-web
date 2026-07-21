export const AUTH_COMPLIANCE_PATTERNS = {
  serviceProvider: /Service provider:\s*Shothik AI/i,
  supportEmail: /support@shothik\.ai/i,
  rememberEmail: /Remember email on this device/i,
  thirdPartyGoogle: /third-party sign-in option such as Google/i,
  analyticsDisclosure: /security and product analytics/i,
  legalLinksSummary: /Privacy Policy,\s*Terms & Conditions,\s*and\s*Data Deletion Policy/i,
  registerConsent:
    /I agree to the\s*Terms\s*&\s*Conditions,\s*acknowledge the\s*Privacy Policy/i,
  // Match the required account-data fields while tolerating editorial whitespace changes.
  accountDataFields:
    /name,\s*email address,\s*password,\s*country,\s*selected workflow intent/i,
  // Keep this separate so copy can add qualifiers without breaking the core field assertion.
  relatedSecurityEvents: /related security events/i,
  registrationSuccess:
    /Registration successful\.\s*Enter the verification code from your email before signing in\./i,
  emailVerifiedSuccess: /Email verified\.\s*You can now sign in\./i,
  passwordResetSuccess: /Password reset successful\.\s*You can now sign in\./i,
  invalidCredentials: /Login failed\.\s*Please check your credentials and try again\./i,
  passwordTooShort: /Password must be at least 8 characters long/i,
  passwordTooCommon: /too common\.\s*Please choose a stronger one\./i,
} as const;

export function normalizeDisclosureText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildResetCodeSentPattern(email: string) {
  return new RegExp(`We sent a reset code to\\s*${escapeRegex(email)}\\.?`, "i");
}
