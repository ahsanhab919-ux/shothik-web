import { describe, expect, it } from "vitest";

import {
  AUTH_COMPLIANCE_PATTERNS,
  buildResetCodeSentPattern,
  normalizeDisclosureText,
} from "../auth-compliance-patterns";

describe("AUTH_COMPLIANCE_PATTERNS", () => {
  it("matches the core account-data fields with flexible whitespace", () => {
    const text = normalizeDisclosureText(`
      We collect only the account data needed to create and secure your account:
      name,   email address, password,
      country, selected workflow intent, and related security events.
    `);

    expect(text).toMatch(AUTH_COMPLIANCE_PATTERNS.accountDataFields);
    expect(text).toMatch(AUTH_COMPLIANCE_PATTERNS.relatedSecurityEvents);
  });

  it("does not match when a required account-data field is missing", () => {
    const text = normalizeDisclosureText(
      "We collect name, email address, password, and selected workflow intent.",
    );

    expect(text).not.toMatch(AUTH_COMPLIANCE_PATTERNS.accountDataFields);
  });

  it("matches service-provider and support-email disclosures", () => {
    const text = normalizeDisclosureText(
      "Service provider: Shothik AI. Contact support@shothik.ai for privacy and deletion requests.",
    );

    expect(text).toMatch(AUTH_COMPLIANCE_PATTERNS.serviceProvider);
    expect(text).toMatch(AUTH_COMPLIANCE_PATTERNS.supportEmail);
  });

  it("matches third-party sign-in and remembered-email disclosures independently", () => {
    const thirdPartyText = normalizeDisclosureText(
      "If you choose a third-party sign-in option such as Google, that provider processes identifiers needed to complete sign-in.",
    );
    const rememberedEmailText = normalizeDisclosureText(
      "If you enable Remember email on this device, your email is stored locally in this browser.",
    );

    expect(thirdPartyText).toMatch(AUTH_COMPLIANCE_PATTERNS.thirdPartyGoogle);
    expect(rememberedEmailText).toMatch(AUTH_COMPLIANCE_PATTERNS.rememberEmail);
  });

  it("matches auth status and validation messages semantically", () => {
    expect("Registration successful. Enter the verification code from your email before signing in.").toMatch(
      AUTH_COMPLIANCE_PATTERNS.registrationSuccess,
    );
    expect("Email verified. You can now sign in.").toMatch(AUTH_COMPLIANCE_PATTERNS.emailVerifiedSuccess);
    expect("Password reset successful. You can now sign in.").toMatch(
      AUTH_COMPLIANCE_PATTERNS.passwordResetSuccess,
    );
    expect("Login failed. Please check your credentials and try again.").toMatch(
      AUTH_COMPLIANCE_PATTERNS.invalidCredentials,
    );
    expect("Password must be at least 8 characters long").toMatch(AUTH_COMPLIANCE_PATTERNS.passwordTooShort);
    expect("This password is too common. Please choose a stronger one.").toMatch(
      AUTH_COMPLIANCE_PATTERNS.passwordTooCommon,
    );
  });

  it("builds reset-code success patterns that safely escape mailbox addresses", () => {
    const pattern = buildResetCodeSentPattern("user+qa@example.com");

    expect("We sent a reset code to user+qa@example.com.").toMatch(pattern);
    expect("We sent a reset code to user@example.com.").not.toMatch(pattern);
  });

  it("normalizes repeated whitespace before regex matching", () => {
    expect(normalizeDisclosureText("a   b\nc\t d")).toBe("a b c d");
  });
});
