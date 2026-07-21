import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

function getEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const dashboardUrl = getEnv("CONVEX_DASHBOARD_BASE_URL") ?? "https://dashboard.convex.dev";
  const outputPath =
    getEnv("CONVEX_STORAGE_STATE_PATH") ??
    path.join(process.cwd(), "test-results", "convex-dashboard-auth", "storage-state.json");
  const timeoutMs = Number(getEnv("CONVEX_CAPTURE_TIMEOUT_MS") ?? "300000");

  await ensureDir(path.dirname(outputPath));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.setDefaultNavigationTimeout(timeoutMs);

  process.stdout.write(
    [
      "[convex-auth-capture] Opening Convex Dashboard in headed mode.",
      "[convex-auth-capture] Complete the login flow manually in the opened browser window.",
      "[convex-auth-capture] The script will wait until the session leaves the Convex auth page and reaches the dashboard.",
      `[convex-auth-capture] Storage state will be written to: ${outputPath}`,
    ].join("\n") + "\n",
  );

  try {
    await page.goto(dashboardUrl, { waitUntil: "domcontentloaded" });
    await page.waitForURL(
      (url) => {
        const value = url.toString();
        return value.startsWith(dashboardUrl) && !value.includes("auth.convex.dev");
      },
      { timeout: timeoutMs },
    );
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

    await context.storageState({ path: outputPath });

    process.stdout.write(
      [
        "[convex-auth-capture] Authentication detected and storage state saved successfully.",
        `[convex-auth-capture] Current URL: ${page.url()}`,
        `[convex-auth-capture] Saved: ${outputPath}`,
      ].join("\n") + "\n",
    );
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

