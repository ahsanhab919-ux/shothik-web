import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { parseEnvFile } from "./lib/credential-audit.mjs";
import { buildVercelEnvAudit, formatVercelEnvAudit } from "./lib/vercel-env-audit.mjs";

function parseArgs(argv) {
  const result = {
    environment: "production",
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      result.json = true;
      continue;
    }

    if (arg === "--environment" && argv[index + 1]) {
      result.environment = argv[index + 1];
      index += 1;
    }
  }

  return result;
}

function readExpectedProductionInsforgeUrl(rootDir) {
  const parentProjectPath = path.join(rootDir, ".insforge", "project.parent.json");
  if (!fs.existsSync(parentProjectPath)) return null;

  try {
    const parentProject = JSON.parse(fs.readFileSync(parentProjectPath, "utf8"));
    return parentProject.oss_host ?? null;
  } catch {
    return null;
  }
}

function pullEnvironmentFile(rootDir, environment) {
  const vercelDir = path.join(rootDir, ".vercel");
  fs.mkdirSync(vercelDir, { recursive: true });

  const outputPath = path.join(vercelDir, `.env.${environment}.audit`);

  try {
    execFileSync(
      "vercel",
      ["env", "pull", outputPath, "--environment", environment, "--yes"],
      {
        cwd: rootDir,
        stdio: "pipe",
        encoding: "utf8",
      },
    );

    return outputPath;
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    const stdout = error.stdout?.toString?.() ?? "";
    throw new Error(
      `Failed to pull Vercel ${environment} environment variables.\n${stdout}${stderr}`.trim(),
    );
  }
}

function listEnvironmentKeys(rootDir, environment) {
  try {
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
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? "";
    const stdout = error.stdout?.toString?.() ?? "";
    throw new Error(
      `Failed to list Vercel ${environment} environment variables.\n${stdout}${stderr}`.trim(),
    );
  }
}

function main() {
  const { environment, json } = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const expectedInsforgeUrl = readExpectedProductionInsforgeUrl(rootDir);

  const auditFilePath = pullEnvironmentFile(rootDir, environment);
  const pulledEnv = parseEnvFile(auditFilePath);
  const listedKeys = listEnvironmentKeys(rootDir, environment);
  const result = buildVercelEnvAudit({
    environment,
    envEntries: pulledEnv,
    listedKeys,
    expectedInsforgeUrl,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatVercelEnvAudit(result));
  }

  process.exitCode = result.pass ? 0 : 1;
}

main();
