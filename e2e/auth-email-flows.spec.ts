import { expect, request as playwrightRequest, test, type Browser, type Response } from "@playwright/test";
import { buildResetCodeSentPattern } from "@/lib/auth-compliance-patterns";
import { getAuthConfig } from "./helpers/disposable-mail";
import {
  getAuthAlertMessage,
  expectLoginComplianceNotice,
  getAuthStatusMessage,
  getForgotPasswordEmailField,
  getForgotPasswordRequestButton,
  getLoginEmailField,
  getResendVerificationCodeButton,
} from "./support/auth-compliance-assertions";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function parseJsonBody(response: { text(): Promise<string> }) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function createIsolatedPage(browser: Browser, forwardedFor: string) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      "x-forwarded-for": forwardedFor,
    },
  });
  const page = await context.newPage();
  return { context, page };
}

test.describe.serial("Auth email flows with disposable mailboxes", () => {
  test.setTimeout(25 * 60 * 1000);

  test("resend verification email delivers correctly and enforces resend throttling", async ({
    browser,
  }) => {
    const { context, page } = await createIsolatedPage(browser, "198.51.100.41");
    const authConfig = await getAuthConfig();
    expect(authConfig?.email?.min_interval_seconds ?? authConfig?.min_interval_seconds ?? 60).toBe(
      60,
    );

    const verificationEmail = `verify-resend-${Date.now()}@example.com`;
    await page.goto(
      `/auth/login?intent=continue&verifyEmail=1&email=${encodeURIComponent(verificationEmail)}`,
    );
    await expectLoginComplianceNotice(page);
    await expect(getLoginEmailField(page)).toHaveValue(verificationEmail);

    const resendResponsePromise = page.waitForResponse((response: Response) =>
      response.url().includes("/api/auth/send-verify-email"),
    );
    await getResendVerificationCodeButton(page).click();
    const resendResponse = await resendResponsePromise;
    expect(resendResponse.ok()).toBeTruthy();
    const resendPayload = await parseJsonBody(resendResponse);
    if (resendPayload) {
      expect(resendPayload).toMatchObject({
        success: true,
      });
    }
    await expect(getAuthStatusMessage(page)).toContainText(/Verification code sent to/i);

    const throttledResponsePromise = page.waitForResponse((response: Response) =>
      response.url().includes("/api/auth/send-verify-email"),
    );
    await getResendVerificationCodeButton(page).click();
    const throttledResponse = await throttledResponsePromise;
    expect(throttledResponse.status()).toBe(429);
    const throttledPayload = await parseJsonBody(throttledResponse);
    expect(throttledPayload).not.toBeNull();
    expect(throttledPayload).toMatchObject({
      error: "AUTH_RESEND_VERIFICATION_RATE_LIMITED",
      message: "Please wait before requesting another verification code.",
    });
    await expect(getAuthAlertMessage(page)).toContainText(
      /please wait before requesting another verification code/i,
    );

    const authLimiterIp = "198.51.100.77";
    const limiterContext = await playwrightRequest.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
      extraHTTPHeaders: {
        "x-forwarded-for": authLimiterIp,
        "Content-Type": "application/json",
      },
    });

    let lastLimiterResponse = null;
    let rateLimitedAttempt: number | null = null;
    for (let index = 0; index < 12; index += 1) {
      const response = await limiterContext.post("/api/auth/sign-in", {
        data: {
          email: `invalid-${index}@example.com`,
          password: "invalid-password",
        },
      });

      if (response.status() === 429) {
        lastLimiterResponse = response;
        rateLimitedAttempt = index + 1;
        break;
      }

      expect(response.status()).not.toBe(429);
      lastLimiterResponse = response;
    }

    expect(rateLimitedAttempt).not.toBeNull();
    expect(rateLimitedAttempt).toBeLessThanOrEqual(12);
    expect(lastLimiterResponse!.status()).toBe(429);
    const authLimitPayload = await parseJsonBody(lastLimiterResponse!);
    expect(authLimitPayload).not.toBeNull();
    expect(authLimitPayload).toMatchObject({
      error: "Too many authentication attempts",
      message: "Please try again later",
    });
    await limiterContext.dispose();
    await context.close();
  });

  test("forgot-password keeps reset messaging generic and privacy-safe", async ({ browser }) => {
    const { context, page } = await createIsolatedPage(browser, "198.51.100.43");
    const email = `reset-request-${Date.now()}@example.com`;

    await page.goto("/auth/forgot-password");
    await getForgotPasswordEmailField(page).fill(email);
    await getForgotPasswordRequestButton(page).click();
    await page.waitForURL(/\/auth\/reset-password\?/);
    await expect(page.getByText(buildResetCodeSentPattern(email))).toBeVisible();
    await context.close();
  });
});
