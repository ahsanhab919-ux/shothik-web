import { expect, type Page } from "@playwright/test";
import {
  expectLoginComplianceNotice,
  getLoginEmailField,
  getLoginPasswordField,
  getLoginSubmitButton,
} from "./auth-compliance-assertions";
import { getE2EAccessConfig } from "./e2e-env";

const accessConfig = getE2EAccessConfig();
const SMOKE_EMAIL = accessConfig.smokeEmail;
const SMOKE_PASSWORD = accessConfig.smokePassword;

export function requireSmokeCredentials() {
  return Boolean(SMOKE_EMAIL && SMOKE_PASSWORD);
}

function escapePathForRegex(pathname: string) {
  return pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loginAsSmokeUser(page: Page, redirectPath: string) {
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    throw new Error(
      "PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD are required.",
    );
  }

  const resolvedTarget = new URL(redirectPath, accessConfig.baseURL);
  await page.goto(resolvedTarget.toString(), {
    waitUntil: "domcontentloaded",
  });

  const currentPathname = new URL(page.url()).pathname;
  if (currentPathname === resolvedTarget.pathname && !currentPathname.startsWith("/auth/login")) {
    return;
  }

  await page.goto(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await expectLoginComplianceNotice(page);
  await getLoginEmailField(page).fill(SMOKE_EMAIL);
  await getLoginPasswordField(page).fill(SMOKE_PASSWORD);

  const signInResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/sign-in") &&
    response.request().method() === "POST",
  );

  await getLoginSubmitButton(page).click();

  const signInResponse = await signInResponsePromise;
  expect(signInResponse.ok()).toBeTruthy();

  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });

  if (page.url().includes("/auth/post-login")) {
    const targetPathname = new URL(redirectPath, page.url()).pathname;
    const redirectPathRegex = new RegExp(escapePathForRegex(redirectPath));

    await page
      .waitForURL((url) => url.pathname === targetPathname, {
        timeout: 10_000,
        waitUntil: "commit",
      })
      .catch(async () => {
        if (new URL(page.url()).pathname === targetPathname) {
          return;
        }

        const continueButton = page.getByRole("button", { name: /continue now/i });
        const recommendation = page.getByText(targetPathname, { exact: false }).first();

        if (await recommendation.isVisible().catch(() => false)) {
          await continueButton.waitFor({ state: "visible", timeout: 2_000 });
          await continueButton.click();
        }

        await page.waitForURL(redirectPathRegex, {
          timeout: 30_000,
          waitUntil: "commit",
        });
      });
  }
}
