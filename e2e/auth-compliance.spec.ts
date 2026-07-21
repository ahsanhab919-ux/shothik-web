import { expect, test } from "@playwright/test";

import {
  expectLoginComplianceNotice,
  expectRegisterComplianceNotice,
  getLoginDeletionPolicyLink,
  getLoginPrivacyPolicyLink,
  getLoginSupportEmailLink,
  getLoginTermsLink,
  getRegisterConsentCheckbox,
  getRegisterPrivacyPolicyLink,
  getRegisterSupportEmailLink,
  getRegisterTermsLink,
} from "./support/auth-compliance-assertions";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("auth compliance disclosures", () => {
  test("login page shows required provider, rights, storage, and legal disclosures", async ({ page }) => {
    await page.goto(new URL("/auth/login?intent=continue", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();
    await expectLoginComplianceNotice(page);

    await expect(getLoginPrivacyPolicyLink(page)).toHaveAttribute("href", "/privacy");
    await expect(getLoginTermsLink(page)).toHaveAttribute("href", "/terms");
    await expect(getLoginDeletionPolicyLink(page)).toHaveAttribute("href", "/deletion");
    await expect(getLoginSupportEmailLink(page)).toHaveAttribute("href", "mailto:support@shothik.ai");
  });

  test("register page shows required provider, purpose, and legal consent disclosures", async ({ page }) => {
    await page.goto(new URL("/auth/register?intent=research", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: /set up your workspace/i })).toBeVisible();
    await expectRegisterComplianceNotice(page);

    await expect(getRegisterTermsLink(page)).toHaveAttribute("href", "/terms");
    await expect(getRegisterPrivacyPolicyLink(page)).toHaveAttribute("href", "/privacy");
    await expect(getRegisterSupportEmailLink(page)).toHaveAttribute("href", "mailto:support@shothik.ai");
    await expect(getRegisterConsentCheckbox(page)).toBeVisible();
  });
});
