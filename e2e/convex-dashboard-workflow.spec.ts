import { expect, test } from "@playwright/test";

type RequiredEnv = {
  teamSlug: string;
  projectSlug: string;
  deploymentSlug: string;
  expectedCloudUrl: string;
  storageStatePath: string;
};

function getRequiredEnv(): RequiredEnv | null {
  const teamSlug = process.env.CONVEX_TEAM_SLUG?.trim();
  const projectSlug = process.env.CONVEX_PROJECT_SLUG?.trim();
  const deploymentSlug = process.env.CONVEX_DEPLOYMENT_SLUG?.trim();
  const expectedCloudUrl = process.env.CONVEX_EXPECTED_CLOUD_URL?.trim();
  const storageStatePath = process.env.CONVEX_STORAGE_STATE_PATH?.trim();

  if (!teamSlug || !projectSlug || !deploymentSlug || !expectedCloudUrl || !storageStatePath) {
    return null;
  }

  return {
    teamSlug,
    projectSlug,
    deploymentSlug,
    expectedCloudUrl,
    storageStatePath,
  };
}

test.describe("Convex dashboard workflow automation", () => {
  test("inspects deployment settings without modifying state", async ({ browser }, testInfo) => {
    const env = getRequiredEnv();
    test.skip(!env, "CONVEX_* workflow env vars are required.");

    const context = await browser.newContext({ storageState: env!.storageStatePath });
    const page = await context.newPage();
    const base = "https://dashboard.convex.dev";
    const deploymentUrl = `${base}/t/${env!.teamSlug}/${env!.projectSlug}/${env!.deploymentSlug}`;
    const envVarsUrl = `${deploymentUrl}/settings/environment-variables`;
    const authUrl = `${deploymentUrl}/settings/authentication`;

    await page.goto(deploymentUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    await page.goto(`${deploymentUrl}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const bodyText = (await page.textContent("body").catch(() => "")) ?? "";
    const cloudMatch = bodyText.match(/https:\/\/[a-z0-9-]+\.convex\.cloud/gi)?.[0];
    expect(cloudMatch).toBe(env!.expectedCloudUrl);

    await page.goto(envVarsUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({ path: testInfo.outputPath("env-vars.png"), fullPage: true });

    await page.goto(authUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({ path: testInfo.outputPath("auth.png"), fullPage: true });

    await context.close();
  });
});

