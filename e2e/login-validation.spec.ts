import { expect, test, type Page, type APIRequestContext, type TestInfo } from "@playwright/test";
import { AUTH_COMPLIANCE_PATTERNS } from "@/lib/auth-compliance-patterns";
import {
  getAuthAlertMessage,
  expectLoginComplianceNotice,
  getForgotPasswordLink,
  getLoginEmailField,
  getLoginPasswordField,
  getLoginSubmitButton,
  getRememberEmailCheckbox,
} from "./support/auth-compliance-assertions";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const LOGIN_REDIRECT_PATH = "/writing-studio";
const LOGIN_PATH = `/auth/login?redirect=${encodeURIComponent(LOGIN_REDIRECT_PATH)}`;
const LOGIN_URL = new URL(LOGIN_PATH, BASE_URL).toString();
const VALID_EMAIL = process.env.PLAYWRIGHT_SMOKE_EMAIL;
const VALID_PASSWORD = process.env.PLAYWRIGHT_SMOKE_PASSWORD;
const LOGIN_LOAD_THRESHOLD_MS = Number(process.env.PLAYWRIGHT_LOGIN_PAGE_THRESHOLD_MS || "10000");
const INVALID_EMAIL = `invalid-${Date.now()}@example.com`;
const INVALID_PASSWORD = "DefinitelyWrong123!";
const SHORT_PASSWORD = "123";
const REMEMBERED_LOGIN_EMAIL_KEY = "shothik_remembered_login_email";
const INLINE_VALIDATION_ALERT = /Please fix the highlighted fields before continuing\./i;

type LoginFailureKind =
  | "invalid_credentials"
  | "rate_limited"
  | "unverified_account"
  | "unknown";

type LoginFailureClassification = {
  kind: LoginFailureKind;
  status: number;
  message: string | null;
  alertText: string;
};

test.describe("login validation workflow", () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);
    await attachRobotsNote(request, testInfo);
  });

  test("page load and elements", async ({ page }, testInfo) => {
    const loadDuration = await gotoLoginAndWait(page);

    expect(loadDuration).toBeLessThanOrEqual(LOGIN_LOAD_THRESHOLD_MS);
    await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();
    await expectLoginComplianceNotice(page);
    await expect(getLoginEmailField(page)).toBeVisible();
    await expect(getLoginPasswordField(page)).toBeVisible();
    await expect(getRememberEmailCheckbox(page)).toBeVisible();
    await expect(getForgotPasswordLink(page)).toHaveAttribute("href", "/auth/forgot-password");
    await expect(getLoginSubmitButton(page)).toBeVisible();
    await expect(getLoginSubmitButton(page)).toBeEnabled();

    await attachScreenshot(page, testInfo, "page-load-and-elements");
  });

  test("empty field validation", async ({ page }, testInfo) => {
    await gotoLoginAndWait(page);

    await getLoginSubmitButton(page).click();

    const emailMissing = await getLoginEmailField(page).evaluate((input) => (input as HTMLInputElement).validity.valueMissing);
    const passwordMissing = await getLoginPasswordField(page).evaluate((input) => (input as HTMLInputElement).validity.valueMissing);
    const emailValidationMessage = await getLoginEmailField(page).evaluate((input) => (input as HTMLInputElement).validationMessage);
    const passwordValidationMessage = await getLoginPasswordField(page).evaluate((input) => (input as HTMLInputElement).validationMessage);

    expect(emailMissing).toBeTruthy();
    expect(passwordMissing).toBeTruthy();
    expect(emailValidationMessage).not.toBe("");
    expect(passwordValidationMessage).not.toBe("");
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(BASE_URL)}.*\\/auth\\/login`));
    await expect(getLoginEmailField(page)).toBeFocused();

    await attachScreenshot(page, testInfo, "empty-field-validation");
  });

  test("client-side invalid input validation surfaces an inline alert", async ({ page }, testInfo) => {
    await gotoLoginAndWait(page);

    await getLoginEmailField(page).fill("writer@example.com");
    await getLoginPasswordField(page).fill(SHORT_PASSWORD);
    await getLoginSubmitButton(page).click();

    await expect(getAuthAlertMessage(page)).toContainText(INLINE_VALIDATION_ALERT);
    await expect(page.getByText("Password must be at least 6 characters long.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(BASE_URL)}.*\\/auth\\/login`));

    await attachScreenshot(page, testInfo, "client-side-invalid-input");
  });

  test("invalid credentials show the inline alert and classify the failure", async ({ page }, testInfo) => {
    const unhandledErrors = trackUnhandledLoginExceptions(page, testInfo);
    await page.route("**/api/auth/sign-in", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "AUTH_UNAUTHORIZED",
          message: "Invalid email or password.",
        }),
      });
    });

    await gotoLoginAndWait(page);

    await getLoginEmailField(page).fill(INVALID_EMAIL);
    await getLoginPasswordField(page).fill(INVALID_PASSWORD);

    const signInResponse = await submitLoginAttempt(page);
    expect(signInResponse.ok()).toBeFalsy();

    await assertLoginFailureAlert(page, signInResponse, testInfo, "invalid_credentials");
    await expectNoUnhandledLoginExceptions(unhandledErrors, testInfo);
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(BASE_URL)}.*\\/auth\\/login`));

    await attachScreenshot(page, testInfo, "invalid-credentials");
  });

  test("rate-limited login attempts show the inline alert and classify throttling", async ({ page }, testInfo) => {
    const unhandledErrors = trackUnhandledLoginExceptions(page, testInfo);
    await page.route("**/api/auth/sign-in", async (route) => {
      await route.fulfill({
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
        body: JSON.stringify({
          error: "AUTH_RATE_LIMITED",
          message: "Too many authentication attempts. Please wait before trying again.",
        }),
      });
    });

    await gotoLoginAndWait(page);

    await getLoginEmailField(page).fill(INVALID_EMAIL);
    await getLoginPasswordField(page).fill(INVALID_PASSWORD);

    const signInResponse = await submitLoginAttempt(page);
    expect(signInResponse.status()).toBe(429);

    await assertLoginFailureAlert(page, signInResponse, testInfo, "rate_limited");
    await expectNoUnhandledLoginExceptions(unhandledErrors, testInfo);
    await attachScreenshot(page, testInfo, "rate-limited-login");
  });

  test("unverified accounts show the inline alert and classify verification failures", async ({ page }, testInfo) => {
    const unhandledErrors = trackUnhandledLoginExceptions(page, testInfo);
    await page.route("**/api/auth/sign-in", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "AUTH_EMAIL_UNVERIFIED",
          message: "Your account needs email verification before you can sign in.",
        }),
      });
    });

    await gotoLoginAndWait(
      page,
      buildLoginPath({
        redirect: LOGIN_REDIRECT_PATH,
        verifyEmail: true,
        email: "pending-verification@example.com",
      }),
    );

    await getLoginEmailField(page).fill("pending-verification@example.com");
    await getLoginPasswordField(page).fill(INVALID_PASSWORD);

    const signInResponse = await submitLoginAttempt(page);
    expect(signInResponse.ok()).toBeFalsy();

    await assertLoginFailureAlert(page, signInResponse, testInfo, "unverified_account");
    await expectNoUnhandledLoginExceptions(unhandledErrors, testInfo);
    await attachScreenshot(page, testInfo, "unverified-account-login");
  });

  test("remembered email hydration", async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(20_000);

    try {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ key, email }) => {
          window.localStorage.setItem(key, email);
        },
        { key: REMEMBERED_LOGIN_EMAIL_KEY, email: "remembered-user@company.test" },
      );

      await gotoLoginAndWait(page);

      await expect(getLoginEmailField(page)).toHaveValue("remembered-user@company.test");
      await expect(getRememberEmailCheckbox(page)).toBeChecked();

      await attachScreenshot(page, testInfo, "remembered-email-hydration");
    } finally {
      await context.close();
    }
  });

  test("forgot password link navigates to the reset-password flow", async ({ page }, testInfo) => {
    await gotoLoginAndWait(page);

    await getForgotPasswordLink(page).click();

    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();

    await attachScreenshot(page, testInfo, "forgot-password-navigation");
  });

  test("login page interactive elements expose stable accessible names", async ({ page }, testInfo) => {
    await gotoLoginAndWait(page);

    await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();
    await expect(getLoginEmailField(page)).toHaveAccessibleName("Email");
    await expect(getLoginPasswordField(page)).toHaveAccessibleName("Password");
    await expect(getRememberEmailCheckbox(page)).toHaveAccessibleName(/remember email on this device/i);
    await expect(getForgotPasswordLink(page)).toHaveAccessibleName(/forgot password\?/i);
    await expect(getLoginSubmitButton(page)).toHaveAccessibleName(/sign in and continue/i);
    await expect(page.getByRole("button", { name: /sign in with google/i })).toHaveAccessibleName(/sign in with google/i);

    await attachScreenshot(page, testInfo, "login-accessibility");
  });

  test("google oauth callback forwards the PKCE verifier through the local exchange route", async ({
    page,
  }, testInfo) => {
    let exchangePayload: { code?: string; codeVerifier?: string } | null = null;

    await page.addInitScript(
      ({ key, value }) => {
        window.sessionStorage.setItem(key, value);
      },
      {
        key: "shothik.oauth.google.codeVerifier",
        value: "e2e-verifier",
      },
    );

    await page.route("**/api/auth/oauth/exchange", async (route) => {
      exchangePayload = JSON.parse(route.request().postData() || "{}") as {
        code?: string;
        codeVerifier?: string;
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "google-user-1",
            _id: "google-user-1",
            name: "OAuth User",
            email: "oauth-user@example.com",
            authProvider: "insforge",
          },
        }),
      });
    });

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          projects: [],
        }),
      });
    });

    const exchangeResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/oauth/exchange") &&
      response.request().method() === "POST",
    );

    await page.goto(new URL("/auth/post-login?insforge_code=test-google-code", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
    });

    const exchangeResponse = await exchangeResponsePromise;
    expect(exchangeResponse.ok()).toBeTruthy();

    await expect
      .poll(() => exchangePayload)
      .toEqual({ code: "test-google-code", codeVerifier: "e2e-verifier" });
    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.sessionStorage.getItem("shothik.oauth.google.codeVerifier"),
        ),
      )
      .toBeNull();
    await expect
      .poll(() => page.url())
      .not.toContain("insforge_code=");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

    await attachScreenshot(page, testInfo, "google-oauth-callback-pkce");
  });

  test("valid credentials", async ({ page }, testInfo) => {
    test.skip(!VALID_EMAIL || !VALID_PASSWORD, "PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD are required.");
    const unhandledErrors = trackUnhandledLoginExceptions(page, testInfo);
    await forwardSignInRequestWithFreshIp(page, testInfo);

    await gotoLoginAndWait(page);

    await getLoginEmailField(page).fill(VALID_EMAIL!);
    await getLoginPasswordField(page).fill(VALID_PASSWORD!);
    await getRememberEmailCheckbox(page).check();

    const signInResponse = await submitLoginAttempt(page);

    if (!signInResponse.ok()) {
      await assertLoginFailureAlert(page, signInResponse, testInfo);
      throw new Error(`Expected sign-in to succeed, but received ${signInResponse.status()}.`);
    }

    await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 30_000 });

    await page.waitForLoadState("networkidle").catch(() => undefined);
    if (page.url().includes("/auth/post-login")) {
      await page.waitForURL((url) => !url.pathname.startsWith("/auth/post-login"), { timeout: 10_000 }).catch(() => undefined);
    }

    await expectNoUnhandledLoginExceptions(unhandledErrors, testInfo);
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page).toHaveURL(/\/(writing-studio|dashboard|agents\/chat|$)/);
    await expect
      .poll(async () => page.evaluate((key) => window.localStorage.getItem(key), REMEMBERED_LOGIN_EMAIL_KEY))
      .toBe(VALID_EMAIL);

    await attachScreenshot(page, testInfo, "valid-credentials");
  });
});

async function inspectRobots(request: APIRequestContext) {
  const robotsUrl = new URL("/robots.txt", BASE_URL).toString();

  try {
    const response = await request.get("/robots.txt");
    const body = await response.text();
    const authDisallowed = /disallow:\s*\/auth\//i.test(body);

    return {
      checked: true,
      url: robotsUrl,
      status: response.status(),
      authDisallowed,
      note: authDisallowed
        ? "robots.txt disallows /auth for crawlers; this run is treated as authorized first-party QA."
        : "robots.txt does not disallow /auth.",
    };
  } catch (error) {
    return {
      checked: false,
      url: robotsUrl,
      note: error instanceof Error ? `robots.txt check failed: ${error.message}` : "robots.txt check failed.",
    };
  }
}

async function gotoLoginAndWait(page: Page, path = LOGIN_URL) {
  const started = Date.now();
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: LOGIN_LOAD_THRESHOLD_MS + 10_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page.getByRole("heading", { name: /sign in to continue/i })).toBeVisible();
  return Date.now() - started;
}

async function attachRobotsNote(request: APIRequestContext, testInfo: TestInfo) {
  const robots = await inspectRobots(request);
  await testInfo.attach("robots-note", {
    body: JSON.stringify(robots, null, 2),
    contentType: "application/json",
  });
}

async function attachScreenshot(page: Page, testInfo: TestInfo, label: string) {
  const filePath = testInfo.outputPath(`${label}.png`);
  try {
    await page.screenshot({ path: filePath, fullPage: true });
    await testInfo.attach(label, {
      path: filePath,
      contentType: "image/png",
    });
  } catch {
    // Ignore evidence capture issues so the primary assertion failure remains visible.
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLoginPath({
  redirect = LOGIN_REDIRECT_PATH,
  verifyEmail = false,
  email,
}: {
  redirect?: string;
  verifyEmail?: boolean;
  email?: string;
} = {}) {
  const params = new URLSearchParams({
    redirect,
  });

  if (verifyEmail) {
    params.set("verifyEmail", "1");
  }

  if (email) {
    params.set("email", email);
  }

  return `/auth/login?${params.toString()}`;
}

async function forwardSignInRequestWithFreshIp(page: Page, testInfo: TestInfo) {
  const octet = 20 + ((testInfo.repeatEachIndex + testInfo.retry + testInfo.parallelIndex + Date.now()) % 200);

  await page.route("**/api/auth/sign-in", async (route) => {
    const response = await route.fetch({
      headers: {
        ...route.request().headers(),
        "x-forwarded-for": `198.51.100.${octet}`,
      },
    });
    await route.fulfill({ response });
  });
}

function trackUnhandledLoginExceptions(page: Page, testInfo: TestInfo) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  testInfo.attach("login-pageerror-monitor", {
    body: JSON.stringify({ active: true }, null, 2),
    contentType: "application/json",
  }).catch(() => undefined);

  return errors;
}

async function submitLoginAttempt(page: Page) {
  const signInResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/sign-in") &&
    response.request().method() === "POST",
  );

  await getLoginSubmitButton(page).click();
  return signInResponsePromise;
}

async function readJsonResponse(response: Awaited<ReturnType<typeof submitLoginAttempt>>) {
  const raw = await response.text();
  if (!raw) {
    return { raw: "", payload: null as Record<string, unknown> | null };
  }

  try {
    return {
      raw,
      payload: JSON.parse(raw) as Record<string, unknown>,
    };
  } catch {
    return {
      raw,
      payload: null,
    };
  }
}

function classifyLoginFailure(input: {
  status: number;
  payload: Record<string, unknown> | null;
  raw: string;
  alertText: string;
  retryAfter: string | null;
}): LoginFailureClassification {
  const payloadMessage =
    typeof input.payload?.message === "string"
      ? input.payload.message
      : typeof input.payload?.error === "string"
        ? input.payload.error
        : null;
  const message = payloadMessage ?? (input.raw.trim() || null);
  const sourceText = [message, input.alertText].filter(Boolean).join(" ");

  if (/email verification|verify your email|unverified/i.test(sourceText)) {
    return {
      kind: "unverified_account",
      status: input.status,
      message,
      alertText: input.alertText,
    };
  }

  if (
    input.status === 429 ||
    Boolean(input.retryAfter) ||
    /too many|rate limit|throttl|please wait|retry-after/i.test(sourceText)
  ) {
    return {
      kind: "rate_limited",
      status: input.status,
      message,
      alertText: input.alertText,
    };
  }

  if (
    input.status === 401 ||
    /invalid email or password|bad credentials|unauthorized|login failed/i.test(sourceText)
  ) {
    return {
      kind: "invalid_credentials",
      status: input.status,
      message,
      alertText: input.alertText,
    };
  }

  return {
    kind: "unknown",
    status: input.status,
    message,
    alertText: input.alertText,
  };
}

async function assertLoginFailureAlert(
  page: Page,
  response: Awaited<ReturnType<typeof submitLoginAttempt>>,
  testInfo: TestInfo,
  expectedKind?: LoginFailureKind,
) {
  const alert = getAuthAlertMessage(page);
  await expect(alert).toBeVisible();

  const alertText = (await alert.textContent())?.trim() ?? "";
  const { raw, payload } = await readJsonResponse(response);
  const classification = classifyLoginFailure({
    status: response.status(),
    payload,
    raw,
    alertText,
    retryAfter: response.headers()["retry-after"] ?? null,
  });

  if (expectedKind) {
    expect(classification.kind).toBe(expectedKind);
  }

  if (classification.kind === "unverified_account") {
    await expect(alert).toContainText(/email verification/i);
  } else if (classification.kind === "rate_limited") {
    await expect(alert).toContainText(/too many authentication attempts|please wait before trying again/i);
  } else {
    await expect(alert).toContainText(AUTH_COMPLIANCE_PATTERNS.invalidCredentials);
  }

  console.info(`[login-validation] detected failure condition: ${classification.kind}`);
  await testInfo.attach("login-failure-classification", {
    body: JSON.stringify(classification, null, 2),
    contentType: "application/json",
  });
}

async function expectNoUnhandledLoginExceptions(errors: string[], testInfo: TestInfo) {
  await testInfo.attach("login-unhandled-exceptions", {
    body: JSON.stringify(errors, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
}
