import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildProjectMetadata,
  buildProjectMutationPlan,
  formatLoopbackProjectTargetError,
  formatProtectedProjectTargetError,
  formatProjectTargetValidationError,
  isAcceptedProjectTargetStatus,
  isLoopbackProjectTarget,
  isProtectedProjectTarget,
  normalizeProjectRecord,
  parseBootstrapArgs,
  resolveProjectBootstrapConfig,
  selectManagedProject,
  testspriteProjectMetadataRelativePath,
} from "./lib/testsprite-project-bootstrap.mjs";
import { buildTestSpriteWorkspaceEnv, resolveTestSpriteProjectEnv } from "./lib/testsprite-env.mjs";

function getWorkspaceEnv(rootDir) {
  return buildTestSpriteWorkspaceEnv(rootDir, process.env);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function runJsonCommand(rootDir, args) {
  const stdout = execFileSync("testsprite", args, {
    cwd: rootDir,
    env: getWorkspaceEnv(rootDir),
    stdio: "pipe",
    encoding: "utf8",
  });

  return JSON.parse(stdout);
}

function runProjectCommand(rootDir, args, { dryRun = false } = {}) {
  const finalArgs = dryRun ? [...args, "--dry-run"] : args;
  return runJsonCommand(rootDir, finalArgs);
}

function probeProjectTargetUrl(rootDir, targetUrl) {
  const probeOutput = execFileSync(
    "curl",
    [
      "-I",
      "-L",
      "--max-time",
      "15",
      "-D",
      "-",
      "-o",
      "/dev/null",
      "-w",
      "\n__TS_EFFECTIVE_URL__=%{url_effective}\n__TS_STATUS_CODE__=%{http_code}\n",
      targetUrl,
    ],
    {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  const statusCodeMatch = probeOutput.match(/__TS_STATUS_CODE__=(\d+)/);
  const effectiveUrlMatch = probeOutput.match(/__TS_EFFECTIVE_URL__=(.+)/);

  return {
    statusCode: Number(statusCodeMatch?.[1] ?? 0),
    effectiveUrl: effectiveUrlMatch?.[1]?.trim() ?? "",
    responseHeaders: probeOutput,
  };
}

function validateProjectTargetUrl(rootDir, targetUrl) {
  if (isLoopbackProjectTarget(targetUrl)) {
    throw new Error(formatLoopbackProjectTargetError(targetUrl));
  }

  const { statusCode, effectiveUrl, responseHeaders } = probeProjectTargetUrl(rootDir, targetUrl);

  if (!isAcceptedProjectTargetStatus(statusCode)) {
    throw new Error(formatProjectTargetValidationError(targetUrl, statusCode));
  }

  if (isProtectedProjectTarget({ effectiveUrl, responseHeaders })) {
    throw new Error(formatProtectedProjectTargetError(targetUrl, effectiveUrl));
  }
}

function writeMetadata(rootDir, metadata) {
  const metadataPath = path.join(rootDir, testspriteProjectMetadataRelativePath);
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  return metadataPath;
}

function formatTextResult(result) {
  const project = normalizeProjectRecord({
    ...result.project,
    targetUrl: result.project?.targetUrl ?? result.requestedTargetUrl ?? result.project?.url,
  });

  return [
    `Action: ${result.action}`,
    `Reason: ${result.reason}`,
    `Project ID: ${project.id ?? "unknown"}`,
    `Project name: ${project.name ?? "unknown"}`,
    `Target URL: ${project.targetUrl ?? "unknown"}`,
    result.metadataPath ? `Metadata: ${result.metadataPath}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function main() {
  const rootDir = process.cwd();
  const cliArgs = parseBootstrapArgs(process.argv.slice(2));
  const packageJson = readJson(path.join(rootDir, "package.json"), {});
  const cachedProject = readJson(
    path.join(rootDir, testspriteProjectMetadataRelativePath),
    null,
  );
  const testspriteEnv = resolveTestSpriteProjectEnv({
    rootDir,
    processEnv: process.env,
  });

  const config = resolveProjectBootstrapConfig({
    cliArgs,
    processEnv: process.env,
    localEnv: testspriteEnv.envEntries,
    packageName: packageJson.name,
  });

  validateProjectTargetUrl(rootDir, config.targetUrl);

  const projectList = runJsonCommand(rootDir, ["project", "list", "--output", "json"]);
  const existingProject = selectManagedProject({
    projectItems: projectList.items ?? [],
    cachedProject,
    projectName: config.projectName,
    targetUrl: config.targetUrl,
  });

  const plan = buildProjectMutationPlan({
    existingProject,
    projectName: config.projectName,
    targetUrl: config.targetUrl,
    type: config.type,
    instruction: config.instruction,
  });

  let project;
  let metadataPath = null;

  if (plan.action === "noop") {
    project = existingProject;
    if (existingProject && !config.dryRun) {
      const metadata = buildProjectMetadata({
        project: existingProject,
        projectName: config.projectName,
        targetUrl: config.targetUrl,
        type: config.type,
      });
      metadataPath = writeMetadata(rootDir, metadata);
    }
  } else {
    project = runProjectCommand(rootDir, plan.args, { dryRun: config.dryRun });

    if (!config.dryRun) {
      const metadata = buildProjectMetadata({
        project,
        projectName: config.projectName,
        targetUrl: config.targetUrl,
        type: config.type,
      });
      metadataPath = writeMetadata(rootDir, metadata);
    }
  }

  const result = {
    action: plan.action,
    reason: plan.reason,
    project,
    metadataPath,
    requestedTargetUrl: config.targetUrl,
  };

  if (config.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatTextResult(result));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
