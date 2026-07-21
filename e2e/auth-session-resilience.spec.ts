"use strict";

import { expect, request as playwrightRequest, test, type Browser, type Page } from "@playwright/test";

import {
  createDisposableMailbox,
  extractSixDigitCode,
  waitForMailboxMessage,
} from "./helpers/disposable-mail";
import {
  getLoginEmailField,
  getLoginPasswordField,
  getLoginSubmitButton,
} from "./support/auth-compliance-assertions";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const PROTECTED_CHAT_PATH = "/agents/chat";
const PROTECTED_WRITING_PATH = "/writing-studio";

type ProvisionedUser = {
  email: string;
  password: string;
};

let provisionedUser: ProvisionedUser;

test.describe.serial("auth session resilience", () => {
  test.beforeAll(async () => {
    const request = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        "x-forwarded-for": "198.51.100.131",
      },
    });
    const mailbox = await createDisposableMailbox("auth-session");
    const password = "MailboxPass123!";

    const signUpResponse = await request.post("/api/auth/sign-up", {
      data: {
        name: "Auth Session QA",
        email: mailbox.address,
        password,
        country: "Bangladesh",
      },
    });
    const signUpPayload = await signUpResponse.json();

    expect(signUpResponse.ok(), JSON.stringify(signUpPayload)).toBeTruthy();
    expect(signUpPayload?.requiresEmailVerification).toBeTruthy();

    const verificationMessage = await waitForMailboxMessage(mailbox, {
      predicate: (message) =>
        /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
    });
    const verificationCode = extractSixDigitCode(verificationMessage);

    const verifyResponse = await request.post("/api/auth/verify-email", {
      data: {
        email: mailbox.address,
        code: verificationCode,
      },
    });
    const verifyPayload = await verifyResponse.json();

    expect(verifyResponse.ok(), JSON.stringify(verifyPayload)).toBeTruthy();

    provisionedUser = {
      email: mailbox.address,
      password,
    };

    await request.dispose();
  });

  test("verified user can sign in and access authenticated chat + token bridge", async ({
    browser,
  }) => {
    const { context, page } = await createIsolatedPage(browser, "198.51.100.132");
    await loginAsProvisionedUser(page, PROTECTED_CHAT_PATH);

    await expect(page).toHaveURL(/\/agents\/chat/);
    await expect(page.getByRole("heading", { name: /chat with shothik ai/i })).toBeVisible();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();

    const convexTokenResponse = await page.evaluate(async () => {
      const response = await fetch("/api/auth/convex-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { raw };
        }
      }

      return {
        status: response.status,
        payload,
      };
    });

    expect(convexTokenResponse.status).toBe(200);
    expect(typeof convexTokenResponse.payload?.token).toBe("string");
    expect(convexTokenResponse.payload.token.length).toBeGreaterThan(20);
    await context.close();
  });

  test("cleared session behaves like expiration and redirects protected routes to login", async ({
    browser,
  }) => {
    const { context, page } = await createIsolatedPage(browser, "198.51.100.133");
    await loginAsProvisionedUser(page, PROTECTED_WRITING_PATH);

    await context.clearCookies();
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto(PROTECTED_WRITING_PATH, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fwriting-studio/);

    const protectedApiResponse = await page.evaluate(async () => {
      const response = await fetch("/api/auth/convex-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { raw };
        }
      }

      return {
        status: response.status,
        payload,
      };
    });

    expect(protectedApiResponse.status).toBe(401);
    expect(protectedApiResponse.payload?.error).toBe("Authentication required");
    await context.close();
  });

  test("sign-out removes access to authenticated API functions", async ({ browser }) => {
    const { context, page } = await createIsolatedPage(browser, "198.51.100.134");
    await loginAsProvisionedUser(page, PROTECTED_CHAT_PATH);

    const signOutResponse = await page.evaluate(async () => {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { raw };
        }
      }

      return {
        status: response.status,
        payload,
      };
    });

    expect(signOutResponse.status).toBe(200);
    expect(signOutResponse.payload?.success).toBeTruthy();

    await page.goto(PROTECTED_CHAT_PATH, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fagents%2Fchat/);
    await context.close();
  });

  test("invalid injected auth tokens do not bypass route protection", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
    });
    const page = await context.newPage();

    await context.addCookies([
      {
        name: "insforge_access_token",
        value: "invalid-access-token",
        url: BASE_URL,
      },
      {
        name: "insforge_refresh_token",
        value: "invalid-refresh-token",
        url: BASE_URL,
      },
    ]);

    await page.addInitScript(() => {
      window.localStorage.setItem("jwt_token", "invalid-legacy-token");
    });

    await page.goto(PROTECTED_CHAT_PATH, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fagents%2Fchat/);

    const protectedApiResponse = await page.evaluate(async () => {
      const response = await fetch("/api/auth/convex-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { raw };
        }
      }

      return {
        status: response.status,
        payload,
      };
    });

    expect(protectedApiResponse.status).toBe(401);
    expect(protectedApiResponse.payload?.error).toBe("Authentication required");

    await context.close();
  });
});

async function loginAsProvisionedUser(page: Page, redirectPath: string) {
  const loginUrl = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();

  await getLoginEmailField(page).fill(provisionedUser.email);
  await getLoginPasswordField(page).fill(provisionedUser.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
      timeout: 30_000,
    }),
    getLoginSubmitButton(page).click(),
  ]);

  if (page.url().includes("/auth/post-login")) {
    await page.waitForURL(
      (url) => url.pathname === redirectPath || !url.pathname.startsWith("/auth/post-login"),
      {
        timeout: 10_000,
      },
    );
  }

  await page.waitForURL((url) => url.pathname === redirectPath, {
    timeout: 10_000,
  });
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
