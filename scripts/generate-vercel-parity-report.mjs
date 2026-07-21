#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { parseEnvFile } from "./lib/credential-audit.mjs";
import { buildCredentialAudit } from "./lib/credential-audit.mjs";
import { buildVercelEnvAudit } from "./lib/vercel-env-audit.mjs";
import {
  buildVercelParityReport,
  formatVercelParityReport,
} from "./lib/vercel-parity-report.mjs";

function parseArgs(argv) {
  return {
    environment:
      argv.includes("--environment") && argv[argv.indexOf("--environment") + 1]
        ? argv[argv.indexOf("--environment") + 1]
        : "production",
  };
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveExpectedInsforgeUrl(rootDir) {
  const parentProjectPath = path.join(rootDir, ".insforge", "project.parent.json");
  if (!fs.existsSync(parentProjectPath)) return null;
  const parentProject = readJsonFile(parentProjectPath);
  return parentProject.oss_host ?? null;
}

function listEnvironmentKeys(rootDir, environment) {
  const output = execFileSync("vercel", ["env", "ls", environment], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
  });

  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^\s+([A-Za-z_][A-Za-z0-9_]*)\s+/)?.[1] ?? null)
      .filter(Boolean),
  );
}

const repoRoot = process.cwd();
const { environment } = parseArgs(process.argv.slice(2));
const localEnvEntries = parseEnvFile(path.join(repoRoot, ".env.local"));
const localAudit = buildCredentialAudit({ fileEnv: localEnvEntries, processEnv: {} });

const vercelAuditPath = path.join(repoRoot, ".vercel", `.env.${environment}.audit`);
if (!fs.existsSync(vercelAuditPath)) {
  throw new Error(
    `Missing ${path.relative(repoRoot, vercelAuditPath)}. Run pnpm audit:vercel:${environment} or vercel env pull first.`,
  );
}

const vercelEnvEntries = parseEnvFile(vercelAuditPath);
const vercelListedKeys = listEnvironmentKeys(repoRoot, environment);
const vercelAudit = buildVercelEnvAudit({
  environment,
  envEntries: vercelEnvEntries,
  listedKeys: vercelListedKeys,
  expectedInsforgeUrl: resolveExpectedInsforgeUrl(repoRoot),
});

const report = buildVercelParityReport({
  localEnvEntries,
  vercelAudit,
  vercelEnvEntries,
  vercelListedKeys,
  localAudit,
});

const reportsDir = path.join(repoRoot, "docs", "reports");
const dateStamp = new Date().toISOString().slice(0, 10);
const reportPath = path.join(reportsDir, `vercel-parity-audit-${dateStamp}.md`);

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportPath, `${formatVercelParityReport(report).trim()}\n`);
console.log(`Wrote ${path.relative(repoRoot, reportPath)}`);
