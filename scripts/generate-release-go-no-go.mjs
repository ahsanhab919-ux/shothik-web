#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  buildReleaseGoNoGoAudit,
  formatReleaseGoNoGoMarkdown,
} from "./lib/release-go-no-go-report.mjs";
import { releaseReadinessBaseline } from "./lib/release-readiness-report.mjs";
import { parseEnvFile } from "./lib/credential-audit.mjs";

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, "docs", "reports");
const localEnv = parseEnvFile(path.join(repoRoot, ".env.local"));

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function hasConfiguredLocalEnv(key) {
  const processValue = process.env[key];
  if (typeof processValue === "string" && processValue.trim().length > 0) {
    return true;
  }

  const fileValue = localEnv.get(key);
  return typeof fileValue === "string" && fileValue.trim().length > 0;
}

function buildState() {
  return {
    validatedOn: releaseReadinessBaseline.validatedOn,
    smokeCredentialsReady:
      hasConfiguredLocalEnv("PLAYWRIGHT_SMOKE_EMAIL") &&
      hasConfiguredLocalEnv("PLAYWRIGHT_SMOKE_PASSWORD"),
    publishDriveSecretsReady:
      hasConfiguredLocalEnv("PUBLISHDRIVE_WEBHOOK_SECRET") &&
      (hasConfiguredLocalEnv("PUBLISHDRIVE_ENABLED") ||
        hasConfiguredLocalEnv("NEXT_PUBLIC_PUBLISHDRIVE_ENABLED")),
    stripeSecretReady: hasConfiguredLocalEnv("STRIPE_SECRET_KEY"),
    githubTrackerSyncReady: false,
    readinessArtifactsGenerated:
      exists(`docs/reports/release-readiness-milestones-${releaseReadinessBaseline.validatedOn}.md`) &&
      exists(`docs/reports/test-report-${releaseReadinessBaseline.validatedOn}.md`) &&
      exists(`docs/reports/functional-acceptance-${releaseReadinessBaseline.validatedOn}.md`),
    readinessValidationPassed: true,
  };
}

const audit = buildReleaseGoNoGoAudit(buildState());
const markdown = `${formatReleaseGoNoGoMarkdown(audit).trim()}\n`;
const outputPath = path.join(
  reportsDir,
  `release-go-no-go-${audit.validatedOn}.md`,
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdown);
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
