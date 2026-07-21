import { expect, test } from "@playwright/test";
import {
  expectLoginComplianceNotice,
  getLoginEmailField,
  getLoginPasswordField,
  getLoginSubmitButton,
} from "./support/auth-compliance-assertions";
import { getE2EAccessConfig, getE2EAccessIssues } from "./support/e2e-env";

const accessConfig = getE2EAccessConfig();
const smokeEmail = accessConfig.smokeEmail;
const smokePassword = accessConfig.smokePassword;
const browserAccessIssues = getE2EAccessIssues(accessConfig, {
  requireRemoteBrowserAccess: accessConfig.isRemote,
});
const authenticatedBrowserAccessIssues = getE2EAccessIssues(accessConfig, {
  requireAuth: true,
  requireRemoteBrowserAccess: accessConfig.isRemote,
});
const canRunBrowserSmoke = browserAccessIssues.length === 0;
const canRunAuthenticatedBrowserSmoke = authenticatedBrowserAccessIssues.length === 0;

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("shothik-web smoke suite", () => {
  test("health endpoint responds", async ({ request }) => {
    const response = await request.get("/api/health");
    if (accessConfig.isRemote && !accessConfig.hasVercelBypass) {
      expect([200, 401, 402, 403]).toContain(response.status());
      return;
    }

    expect(response.ok()).toBeTruthy();
  });

  test("swagger endpoint responds", async ({ request }) => {
    const response = await request.get("/api/docs/swagger.json");
    if (accessConfig.isRemote && !accessConfig.hasVercelBypass) {
      expect([200, 401, 402, 403]).toContain(response.status());
      return;
    }

    if (accessConfig.isRemote) {
      expect([200, 401, 403]).toContain(response.status());
      return;
    }

    // Local/dev smoke should treat a protected docs endpoint as healthy as long
    // as the route responds instead of failing at the framework layer.
    expect([200, 401, 403]).toContain(response.status());
  });

  if (canRunBrowserSmoke) {
    test("homepage loads", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(new RegExp(`^${escapeRegex(accessConfig.baseURL)}`));
    });
  } else {
    test("homepage browser smoke is deferred for protected previews without bypass", async () => {
      test.skip(true, browserAccessIssues.join(" "));
    });
  }

  if (canRunAuthenticatedBrowserSmoke) {
    test("authenticated users land on chat after login", async ({ page }) => {
      await page.goto(`/auth/login?redirect=${encodeURIComponent("/agents/chat")}`);
      await expectLoginComplianceNotice(page);

      await getLoginEmailField(page).fill(smokeEmail!);
      await getLoginPasswordField(page).fill(smokePassword!);

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
        await page.waitForURL(/\/agents\/chat/, {
          timeout: 3_000,
          waitUntil: "commit",
        }).catch(async () => {
          const continueButton = page.getByRole("button", { name: /continue now/i });
          const recommendation = page.getByText("/agents/chat", { exact: false }).first();

          if (await recommendation.isVisible().catch(() => false)) {
            await continueButton.waitFor({ state: "visible", timeout: 2_000 });
            await continueButton.click();
          }

          await page.waitForURL(/\/agents\/chat/, {
            timeout: 30_000,
            waitUntil: "commit",
          });
        });
      }

      await expect(page).toHaveURL(/\/agents\/chat/);
      await expect(page.getByRole("heading", { name: /chat with shothik ai/i })).toBeVisible();
      await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /open debug log/i })).toBeVisible();
    });
  } else {
    test("authenticated browser smoke is deferred until credentials and preview bypass are available", async () => {
      test.skip(true, authenticatedBrowserAccessIssues.join(" "));
    });
  }
});
