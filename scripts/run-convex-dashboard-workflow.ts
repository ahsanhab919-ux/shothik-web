import path from "node:path";

import { runConvexDashboardWorkflowMatrix } from "./convex-dashboard/workflow";

function getEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

async function main() {
  const baseUrl = getEnv("CONVEX_DASHBOARD_BASE_URL") ?? "https://dashboard.convex.dev";
  const teamSlug = getEnv("CONVEX_TEAM_SLUG");
  const projectSlug = getEnv("CONVEX_PROJECT_SLUG");
  const deploymentSlug = getEnv("CONVEX_DEPLOYMENT_SLUG");
  const expectedCloudUrl = getEnv("CONVEX_EXPECTED_CLOUD_URL");
  const expectedHttpActionsUrl = getEnv("CONVEX_EXPECTED_HTTP_ACTIONS_URL") ?? undefined;
  const storageStatePath = getEnv("CONVEX_STORAGE_STATE_PATH") ?? undefined;
  const outputDir =
    getEnv("CONVEX_WORKFLOW_OUTPUT_DIR") ??
    path.join(process.cwd(), "test-results", "convex-dashboard-workflow");
  const headless = (getEnv("CONVEX_HEADLESS") ?? "true").toLowerCase() !== "false";
  const verbose = (getEnv("CONVEX_WORKFLOW_VERBOSE") ?? "false").toLowerCase() === "true";
  const retriesPerStep = Number(getEnv("CONVEX_RETRIES_PER_STEP") ?? "2");
  const stepTimeoutMs = Number(getEnv("CONVEX_STEP_TIMEOUT_MS") ?? "30000");

  if (!teamSlug || !projectSlug || !deploymentSlug || !expectedCloudUrl) {
    throw new Error(
      "Missing required environment variables: CONVEX_TEAM_SLUG, CONVEX_PROJECT_SLUG, CONVEX_DEPLOYMENT_SLUG, CONVEX_EXPECTED_CLOUD_URL.",
    );
  }

  const summaries = await runConvexDashboardWorkflowMatrix({
    baseUrl,
    teamSlug,
    projectSlug,
    deploymentSlug,
    expectedCloudUrl,
    expectedHttpActionsUrl,
    storageStatePath,
    outputDir,
    headless,
    verbose,
    retriesPerStep,
    stepTimeoutMs,
  });

  const failed = summaries.filter((summary) => summary.results.some((result) => !result.ok));
  if (failed.length) {
    process.exitCode = 1;
  }

  const summarized = summaries.map((summary) => ({
    runId: summary.runId,
    browserName: summary.browserName,
    ok: summary.results.every((result) => result.ok),
    durationMs: summary.durationMs,
    resolvedCloudUrl: summary.findings.resolvedCloudUrl,
    resolvedHttpActionsUrl: summary.findings.resolvedHttpActionsUrl,
    envVarCount: summary.findings.envVarNames?.length ?? 0,
    authProvidersEmpty: summary.findings.authProvidersEmpty,
    summaryPath: path.join(summary.config.outputDir, summary.runId, "summary.json"),
  }));

  process.stdout.write(`${JSON.stringify(summarized, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

