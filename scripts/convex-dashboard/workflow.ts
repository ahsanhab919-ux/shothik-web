import fs from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit, type BrowserType, type Page } from "@playwright/test";

type WorkflowConfig = {
  baseUrl: string;
  teamSlug: string;
  projectSlug: string;
  deploymentSlug: string;
  expectedCloudUrl: string;
  expectedHttpActionsUrl?: string;
  storageStatePath?: string;
  outputDir: string;
  headless: boolean;
  retriesPerStep: number;
  stepTimeoutMs: number;
  verbose: boolean;
};

type StepResult = {
  stepId: string;
  ok: boolean;
  attempts: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  errorMessage?: string;
  screenshotPath?: string;
  url?: string;
};

type WorkflowRunSummary = {
  runId: string;
  browserName: string;
  config: Omit<WorkflowConfig, "storageStatePath"> & { storageStatePath?: string };
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: StepResult[];
  findings: {
    resolvedCloudUrl?: string;
    resolvedHttpActionsUrl?: string;
    envVarNames?: string[];
    authProvidersEmpty?: boolean;
  };
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath: string, payload: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function appendJsonl(filePath: string, payload: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function isRetryableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Timeout/i.test(message) ||
    /net::ERR/i.test(message) ||
    /Target closed/i.test(message) ||
    /Execution context was destroyed/i.test(message)
  );
}

async function takeStepScreenshot(page: Page, outputDir: string, stepId: string, suffix: string) {
  const filePath = path.join(outputDir, `${stepId}-${suffix}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function runStep(options: {
  stepId: string;
  page: Page;
  outputDir: string;
  logPath: string;
  retries: number;
  timeoutMs: number;
  verbose: boolean;
  fn: () => Promise<void>;
}) {
  const startedAt = Date.now();
  const startedAtIso = nowIso();
  await appendJsonl(options.logPath, {
    type: "step_start",
    stepId: options.stepId,
    startedAt: startedAtIso,
  });
  if (options.verbose) {
    process.stdout.write(`[convex-workflow] step_start ${options.stepId}\n`);
  }
  let attempts = 0;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    attempts = attempt + 1;
    try {
      await appendJsonl(options.logPath, {
        type: "step_attempt",
        stepId: options.stepId,
        attempt: attempts,
        at: nowIso(),
      });
      await options.page.waitForTimeout(50);
      await options.fn();
      const finishedAt = Date.now();
      const screenshotPath = await takeStepScreenshot(
        options.page,
        options.outputDir,
        options.stepId,
        "ok",
      ).catch(() => undefined);
      const result: StepResult = {
        stepId: options.stepId,
        ok: true,
        attempts,
        startedAt: startedAtIso,
        finishedAt: nowIso(),
        durationMs: finishedAt - startedAt,
        screenshotPath,
        url: options.page.url(),
      };
      await appendJsonl(options.logPath, { type: "step", ...result });
      if (options.verbose) {
        process.stdout.write(`[convex-workflow] step_ok ${options.stepId} attempts=${attempts}\n`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = isRetryableError(error);
      const isLast = attempt >= options.retries || !retryable;
      const screenshotPath = await takeStepScreenshot(
        options.page,
        options.outputDir,
        options.stepId,
        isLast ? "fail" : `retry-${attempt + 1}`,
      ).catch(() => undefined);
      await appendJsonl(options.logPath, {
        type: "step_error",
        stepId: options.stepId,
        attempt: attempt + 1,
        retryable,
        message,
        screenshotPath,
        url: options.page.url(),
      });
      if (options.verbose) {
        process.stdout.write(
          `[convex-workflow] step_error ${options.stepId} attempt=${attempt + 1} retryable=${String(
            retryable,
          )}\n`,
        );
      }
      if (isLast) {
        const finishedAt = Date.now();
        const result: StepResult = {
          stepId: options.stepId,
          ok: false,
          attempts,
          startedAt: startedAtIso,
          finishedAt: nowIso(),
          durationMs: finishedAt - startedAt,
          errorMessage: message,
          screenshotPath,
          url: options.page.url(),
        };
        await appendJsonl(options.logPath, { type: "step", ...result });
        if (options.verbose) {
          process.stdout.write(`[convex-workflow] step_fail ${options.stepId} attempts=${attempts}\n`);
        }
        return result;
      }
      const backoffMs = Math.min(10_000, 500 * 2 ** attempt);
      await sleep(backoffMs);
      await options.page.waitForTimeout(50);
      await options.page.reload({ waitUntil: "domcontentloaded", timeout: options.timeoutMs }).catch(() => undefined);
    }
  }

  const finishedAt = Date.now();
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  const result: StepResult = {
    stepId: options.stepId,
    ok: false,
    attempts,
    startedAt: startedAtIso,
    finishedAt: nowIso(),
    durationMs: finishedAt - startedAt,
    errorMessage: message,
    url: options.page.url(),
  };
  await appendJsonl(options.logPath, { type: "step", ...result });
  if (options.verbose) {
    process.stdout.write(`[convex-workflow] step_fail ${options.stepId} attempts=${attempts}\n`);
  }
  return result;
}

async function ensureAuthenticated(page: Page, config: WorkflowConfig) {
  const dashboardUrl = new URL("/", config.baseUrl).toString();
  await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  const url = page.url();
  if (url.includes("auth.convex.dev") || /sign\s*in/i.test(await page.textContent("body").catch(() => "") ?? "")) {
    throw new Error(
      "Convex Dashboard is not authenticated in this browser context. Provide CONVEX_STORAGE_STATE_PATH to run non-interactively.",
    );
  }
}

async function resolveDeploymentUrls(page: Page) {
  const bodyText = await page.textContent("body").catch(() => "");
  const cloudMatch = bodyText?.match(/https:\/\/[a-z0-9-]+\.convex\.cloud/gi) ?? [];
  const siteMatch = bodyText?.match(/https:\/\/[a-z0-9-]+\.convex\.site/gi) ?? [];
  return {
    cloudUrl: cloudMatch[0],
    httpActionsUrl: siteMatch[0],
  };
}

async function extractEnvVarNames(page: Page) {
  const rows = await page.locator("table tbody tr").all().catch(() => []);
  const names: string[] = [];
  for (const row of rows) {
    const firstCell = row.locator("td").first();
    const value = await firstCell.innerText().catch(() => "");
    const trimmed = value.trim();
    if (trimmed) names.push(trimmed);
  }
  return Array.from(new Set(names));
}

async function detectAuthProvidersEmpty(page: Page) {
  const content = (await page.textContent("body").catch(() => "")) ?? "";
  return /no authentication providers yet/i.test(content);
}

async function openDeployment(page: Page, config: WorkflowConfig) {
  const deploymentUrl = new URL(
    `/t/${config.teamSlug}/${config.projectSlug}/${config.deploymentSlug}`,
    config.baseUrl,
  ).toString();
  await page.goto(deploymentUrl, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function openGeneralSettings(page: Page, config: WorkflowConfig) {
  const url = new URL(
    `/t/${config.teamSlug}/${config.projectSlug}/${config.deploymentSlug}/settings`,
    config.baseUrl,
  ).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function openEnvVars(page: Page, config: WorkflowConfig) {
  const url = new URL(
    `/t/${config.teamSlug}/${config.projectSlug}/${config.deploymentSlug}/settings/environment-variables`,
    config.baseUrl,
  ).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function openAuthProviders(page: Page, config: WorkflowConfig) {
  const url = new URL(
    `/t/${config.teamSlug}/${config.projectSlug}/${config.deploymentSlug}/settings/authentication`,
    config.baseUrl,
  ).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

async function openCloudEndpoint(page: Page, config: WorkflowConfig) {
  await page.goto(config.expectedCloudUrl, { waitUntil: "domcontentloaded", timeout: config.stepTimeoutMs });
  const body = (await page.textContent("body").catch(() => "")) ?? "";
  if (!/deployment is running/i.test(body)) {
    throw new Error("Convex cloud endpoint did not return the expected running status page.");
  }
}

export async function runConvexDashboardWorkflow(browserType: BrowserType, browserName: string, config: WorkflowConfig) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${browserName}`;
  const outputDir = path.join(config.outputDir, runId);
  const logPath = path.join(outputDir, "activity.jsonl");
  const summaryPath = path.join(outputDir, "summary.json");
  await ensureDir(outputDir);

  const runStarted = Date.now();
  await appendJsonl(logPath, { type: "run_start", runId, startedAt: nowIso(), browserName });

  const browser = await browserType.launch({ headless: config.headless });
  const context = await browser.newContext(
    config.storageStatePath ? { storageState: config.storageStatePath } : undefined,
  );
  const page = await context.newPage();
  page.setDefaultTimeout(config.stepTimeoutMs);
  page.setDefaultNavigationTimeout(config.stepTimeoutMs);

  const results: StepResult[] = [];
  const findings: WorkflowRunSummary["findings"] = {};

  try {
    results.push(
      await runStep({
        stepId: "01-auth",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => ensureAuthenticated(page, config),
      }),
    );

    results.push(
      await runStep({
        stepId: "02-open-deployment",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => openDeployment(page, config),
      }),
    );

    results.push(
      await runStep({
        stepId: "03-general-settings",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => openGeneralSettings(page, config),
      }),
    );

    results.push(
      await runStep({
        stepId: "04-validate-urls",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => {
          const resolved = await resolveDeploymentUrls(page);
          findings.resolvedCloudUrl = resolved.cloudUrl;
          findings.resolvedHttpActionsUrl = resolved.httpActionsUrl;
          if (!resolved.cloudUrl || resolved.cloudUrl !== config.expectedCloudUrl) {
            throw new Error(
              `Cloud URL mismatch. Expected ${config.expectedCloudUrl}, found ${resolved.cloudUrl ?? "none"}.`,
            );
          }
          if (config.expectedHttpActionsUrl && resolved.httpActionsUrl !== config.expectedHttpActionsUrl) {
            throw new Error(
              `HTTP Actions URL mismatch. Expected ${config.expectedHttpActionsUrl}, found ${
                resolved.httpActionsUrl ?? "none"
              }.`,
            );
          }
        },
      }),
    );

    results.push(
      await runStep({
        stepId: "05-env-vars",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => {
          await openEnvVars(page, config);
          findings.envVarNames = await extractEnvVarNames(page);
        },
      }),
    );

    results.push(
      await runStep({
        stepId: "06-auth-providers",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => {
          await openAuthProviders(page, config);
          findings.authProvidersEmpty = await detectAuthProvidersEmpty(page);
        },
      }),
    );

    results.push(
      await runStep({
        stepId: "07-cloud-endpoint",
        page,
        outputDir,
        logPath,
        retries: config.retriesPerStep,
        timeoutMs: config.stepTimeoutMs,
        verbose: config.verbose,
        fn: async () => openCloudEndpoint(page, config),
      }),
    );
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }

  const finishedAt = Date.now();
  const summary: WorkflowRunSummary = {
    runId,
    browserName,
    config: {
      baseUrl: config.baseUrl,
      teamSlug: config.teamSlug,
      projectSlug: config.projectSlug,
      deploymentSlug: config.deploymentSlug,
      expectedCloudUrl: config.expectedCloudUrl,
      expectedHttpActionsUrl: config.expectedHttpActionsUrl,
      outputDir: config.outputDir,
      headless: config.headless,
      retriesPerStep: config.retriesPerStep,
      stepTimeoutMs: config.stepTimeoutMs,
      verbose: config.verbose,
      storageStatePath: config.storageStatePath,
    },
    startedAt: new Date(runStarted).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - runStarted,
    results,
    findings,
  };

  await writeJson(summaryPath, summary);
  await appendJsonl(logPath, { type: "run_finish", runId, finishedAt: nowIso(), durationMs: finishedAt - runStarted });
  return summary;
}

export async function runConvexDashboardWorkflowMatrix(config: WorkflowConfig) {
  const matrix: Array<{ name: string; type: BrowserType }> = [
    { name: "chromium", type: chromium },
    { name: "firefox", type: firefox },
    { name: "webkit", type: webkit },
  ];

  const summaries: WorkflowRunSummary[] = [];
  for (const item of matrix) {
    summaries.push(await runConvexDashboardWorkflow(item.type, item.name, config));
  }
  return summaries;
}
