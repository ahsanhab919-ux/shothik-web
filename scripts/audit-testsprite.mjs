import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { buildTestSpriteAudit, formatTestSpriteAuditMarkdown, hasPlaceholderAnalysis } from "./lib/testsprite-readiness-report.mjs";
import { testspriteProjectMetadataRelativePath } from "./lib/testsprite-project-bootstrap.mjs";
import {
  buildTestSpriteWorkspaceEnv,
  resolveTestSpriteApiKey,
  resolveTestSpriteProjectEnv,
} from "./lib/testsprite-env.mjs";

function parseArgs(argv) {
  return {
    json: argv.includes("--json"),
    write: argv.includes("--write"),
  };
}

function safeReadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function safeReadText(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function commandExists(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], {
      stdio: "pipe",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

function getWorkspaceEnv(rootDir) {
  return buildTestSpriteWorkspaceEnv(rootDir, process.env);
}

function runJsonCommand(command, args, rootDir) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
      env: getWorkspaceEnv(rootDir),
    });

    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function isRuntimeLockPresent(rootDir) {
  const lockPath = path.join(rootDir, "testsprite_tests", "tmp", "execution.lock");
  return fs.existsSync(lockPath);
}

function isLocalAppReachable(rootDir) {
  try {
    execFileSync("curl", ["-I", "--max-time", "10", "http://127.0.0.1:3000/"], {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

function areRunnerScriptsReady(packageJson) {
  const scripts = packageJson?.scripts ?? {};
  return Boolean(
    scripts["testsprite:mcp"] &&
      scripts["testsprite:run"] &&
      scripts["testsprite:status"] &&
      scripts["testsprite:unlock"],
  );
}

function areWorkspaceArtifactsReady(rootDir) {
  const requiredFiles = [
    path.join(rootDir, "testsprite_tests", "standard_prd.json"),
    path.join(rootDir, "testsprite_tests", "testsprite_frontend_test_plan.json"),
    path.join(rootDir, "testsprite_tests", "tmp", "code_summary.yaml"),
    path.join(rootDir, "testsprite_tests", "testsprite-mcp-test-report.md"),
  ];

  return requiredFiles.every((filePath) => fs.existsSync(filePath));
}

function areAuthJourneyCredentialsReady(testspriteProjectEnv) {
  return Boolean(testspriteProjectEnv.smokeEmail) && Boolean(testspriteProjectEnv.smokePassword);
}

function collectAuditState(rootDir) {
  const packageJson = safeReadJson(path.join(rootDir, "package.json"), {});
  const testspriteApiEnv = resolveTestSpriteApiKey({
    rootDir,
    processEnv: process.env,
  });
  const testspriteProjectEnv = resolveTestSpriteProjectEnv({
    rootDir,
    processEnv: process.env,
  });
  const authStatus = runJsonCommand("testsprite", ["auth", "status", "--output", "json"], rootDir);
  const doctorStatus = runJsonCommand("testsprite", ["doctor", "--output", "json"], rootDir);
  const projectList = runJsonCommand("testsprite", ["project", "list", "--output", "json"], rootDir);
  const cachedProject = safeReadJson(
    path.join(rootDir, testspriteProjectMetadataRelativePath),
    null,
  );
  const testResults = safeReadJson(path.join(rootDir, "testsprite_tests", "tmp", "test_results.json"), []);
  const rawReport = safeReadText(path.join(rootDir, "testsprite_tests", "tmp", "raw_report.md"));
  const curatedReportPath = path.join(rootDir, "testsprite_tests", "testsprite-mcp-test-report.md");

  return {
    validatedOn: new Date().toISOString().slice(0, 10),
    defaultOwner: "Ahsan Habib (@ahsanhab919-ux)",
    cliInstalled: commandExists("testsprite"),
    cliVersion: packageJson?.scripts ? getCliVersion(rootDir) : "unknown",
    cliAuthenticated: Boolean(authStatus?.email),
    accountEmail: authStatus?.email ?? null,
    credits: authStatus?.credits ?? null,
    subPlan: authStatus?.subPlan ?? null,
    apiKeyConfigured: Boolean(testspriteApiEnv.apiKey),
    apiKeySource: testspriteApiEnv.source,
    localAppReachable: isLocalAppReachable(rootDir),
    runnerScriptsReady: areRunnerScriptsReady(packageJson),
    workspaceArtifactsReady: areWorkspaceArtifactsReady(rootDir),
    projectConfigured: Boolean(cachedProject?.id || projectList?.items?.length),
    agentSkillInstalled: !doctorStatus?.checks?.some(
      (check) => check?.name === "Verify skill" && check?.status === "warn",
    ),
    runtimeLockPresent: isRuntimeLockPresent(rootDir),
    authJourneyCredentialsReady: areAuthJourneyCredentialsReady(testspriteProjectEnv),
    rawReportHasPlaceholders: hasPlaceholderAnalysis(rawReport),
    curatedReportPresent: fs.existsSync(curatedReportPath),
    testResults,
  };
}

function getCliVersion(rootDir) {
  try {
    return execFileSync("testsprite", ["--version"], {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
      env: getWorkspaceEnv(rootDir),
    }).trim();
  } catch {
    return "unknown";
  }
}

function writeReport(rootDir, markdown) {
  const outputPath = path.join(
    rootDir,
    "docs",
    "reports",
    `testsprite-readiness-${new Date().toISOString().slice(0, 10)}.md`,
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown);

  return outputPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const audit = buildTestSpriteAudit(collectAuditState(rootDir));
  const markdown = formatTestSpriteAuditMarkdown(audit);

  if (args.write) {
    const reportPath = writeReport(rootDir, markdown);
    console.log(`Wrote ${reportPath}`);
  }

  if (args.json) {
    console.log(JSON.stringify(audit, null, 2));
    return;
  }

  console.log(markdown);
}

main();
