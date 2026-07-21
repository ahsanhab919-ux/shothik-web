import fs from "node:fs/promises";
import path from "node:path";
import { test } from "@playwright/test";
import { getE2EAccessConfig, getE2EAccessIssues } from "./support/e2e-env";
import { loginAsSmokeUser } from "./support/smoke-auth";

const accessConfig = getE2EAccessConfig();

test.describe("authenticated browser automation setup", () => {
  test("captures authenticated storage state for smoke flows", async ({ page, context }) => {
    test.skip(!accessConfig.useAuthSetup, "PLAYWRIGHT_USE_AUTH_SETUP=true is required.");

    const issues = getE2EAccessIssues(accessConfig, {
      requireAuth: true,
      requireRemoteBrowserAccess: accessConfig.isRemote,
    });
    if (issues.length > 0) {
      throw new Error(issues.join(" "));
    }

    await loginAsSmokeUser(page, "/agents/chat");
    await fs.mkdir(path.dirname(accessConfig.storageStatePath), { recursive: true });
    await context.storageState({ path: accessConfig.storageStatePath });
  });
});
