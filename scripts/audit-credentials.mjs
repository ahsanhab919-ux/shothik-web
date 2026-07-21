#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";

import {
  buildCredentialAudit,
  parseEnvFile,
} from "./lib/credential-audit.mjs";

const rootDir = process.cwd();
const localEnvPath = path.join(rootDir, ".env.local");
const audit = buildCredentialAudit({
  fileEnv: parseEnvFile(localEnvPath),
  processEnv: process.env,
});

const asJson = process.argv.includes("--json");

if (asJson) {
  process.stdout.write(
    `${JSON.stringify(
      {
        envFile: fs.existsSync(localEnvPath) ? ".env.local" : null,
        ...audit,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

console.log("Shothik credential audit");
console.log("========================");
console.log(`Local env file detected: ${fs.existsSync(localEnvPath) ? "yes" : "no"}`);
console.log("");

for (const section of audit.summary) {
  const headline =
    `${section.category} ` +
    `[configured=${section.configuredCount}, placeholder=${section.placeholderCount}, missing=${section.missingCount}]`;
  console.log(headline);
  console.log("-".repeat(headline.length));
  console.log(`Status: ${section.status}`);
  console.log(`Required: ${section.required ? "yes" : "feature-dependent"}`);
  console.log(`Preferred manager: ${section.manager}`);
  if (section.oneOfSatisfied !== null) {
    console.log(`One-of requirement satisfied: ${section.oneOfSatisfied ? "yes" : "no"}`);
  }

  for (const row of section.rows) {
    const sourceLabel = row.source ?? "not set";
    console.log(`- ${row.key} [${row.type}]: ${row.status} via ${sourceLabel} (${row.note})`);
  }
  console.log("");
}

if (audit.blockingGaps.length > 0) {
  console.log("Blocking gaps");
  console.log("-------------");
  for (const gap of audit.blockingGaps) {
    console.log(`- ${gap.category}: ${gap.key} -> ${gap.reason}`);
  }
  console.log("");
}

if (audit.migrationWarnings.length > 0) {
  console.log("Migration warnings");
  console.log("------------------");
  for (const warning of audit.migrationWarnings) {
    console.log(`- ${warning.category}: ${warning.key} -> ${warning.reason}`);
  }
  console.log("");
}
