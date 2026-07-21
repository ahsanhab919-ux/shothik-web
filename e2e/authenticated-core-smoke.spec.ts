import { expect, test, type Page } from "@playwright/test";
import { expectLoginComplianceNotice } from "./support/auth-compliance-assertions";
import { resolveOptionalStorageStatePath } from "./support/e2e-env";
import { loginAsSmokeUser } from "./support/smoke-auth";

const SMOKE_EMAIL = process.env.PLAYWRIGHT_SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.PLAYWRIGHT_SMOKE_PASSWORD;
const storageStatePath = resolveOptionalStorageStatePath();

test.use({
  storageState: storageStatePath,
});

type BrowserFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function parseJsonFetch(page: Page, input: string, init?: BrowserFetchInit) {
  return page.evaluate(
    async ({ requestInput, requestInit }) => {
      const response = await fetch(requestInput, requestInit);
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
    },
    {
      requestInput: input,
      requestInit: init,
    },
  );
}

test.describe.serial("authenticated core smoke", () => {
  test("smoke account can access core authenticated surfaces", async ({ page }) => {
    test.skip(!SMOKE_EMAIL || !SMOKE_PASSWORD, "PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD are required.");

    await loginAsSmokeUser(page, "/agents/chat");
    await expect(page).toHaveURL(/\/agents\/chat/);
    await expect(page.getByRole("heading", { name: /chat with shothik ai/i })).toBeVisible();

    const convexTokenResponse = await parseJsonFetch(page, "/api/auth/convex-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(convexTokenResponse.status).toBe(200);
    expect(typeof convexTokenResponse.payload?.token).toBe("string");

    const projectsResponse = await parseJsonFetch(page, "/api/projects");
    expect(projectsResponse.status).toBe(200);
    expect(Array.isArray(projectsResponse.payload?.projects)).toBe(true);

    const refreshResponse = await parseJsonFetch(page, "/api/auth/refresh", { method: "POST" });
    expect(refreshResponse.status).toBe(200);
    expect(typeof refreshResponse.payload?.accessToken).toBe("string");

    const adminBooksResponse = await parseJsonFetch(page, "/api/admin/books");
    expect(adminBooksResponse.status).toBe(403);
    expect(String(adminBooksResponse.payload?.message ?? "")).toMatch(/admin/i);

    await page.goto("/writing-studio?projects=1", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/writing-studio/);
    await expect(page).not.toHaveURL(/\/auth\/login/);

    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/community/);
    await expect(page.getByRole("link", { name: /discover feed/i })).toBeVisible();

    const signOutResponse = await parseJsonFetch(page, "/api/auth/sign-out", { method: "POST" });
    expect(signOutResponse.status).toBe(200);

    const projectsAfterSignOut = await parseJsonFetch(page, "/api/projects");
    expect([401, 403]).toContain(projectsAfterSignOut.status);

    await page.goto("/agents/chat", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/login/);
    await expectLoginComplianceNotice(page);
  });
});
