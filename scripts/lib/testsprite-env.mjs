import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseEnvContent, parseEnvFile } from "./credential-audit.mjs";

export const testspriteTmpConfigRelativePath = path.join("testsprite_tests", "tmp", "config.json");
export const testspriteWorkspaceConfigRelativePath = path.join(
  ".testsprite-home",
  "Library",
  "Preferences",
  "@testsprite",
  "testsprite-mcp-nodejs",
  "config.json",
);

/**
 * @param {string} rootDir
 * @param {string} [nodeEnv]
 */
export function getTestSpriteEnvFilePaths(rootDir, nodeEnv = "development") {
  return [
    ".env",
    `.env.${nodeEnv}`,
    ".env.local",
    `.env.${nodeEnv}.local`,
    ".env.testsprite",
    `.env.testsprite.${nodeEnv}`,
    ".env.testsprite.local",
    `.env.testsprite.${nodeEnv}.local`,
  ].map((fileName) => path.join(rootDir, fileName));
}

/**
 * @param {string} rootDir
 * @param {string} [nodeEnv]
 */
export function loadTestSpriteEnv(rootDir, nodeEnv = "development") {
  const merged = new Map();

  for (const filePath of getTestSpriteEnvFilePaths(rootDir, nodeEnv)) {
    const parsed = parseEnvFile(filePath);

    for (const [key, value] of parsed.entries()) {
      merged.set(key, value);
    }
  }

  return merged;
}

/**
 * @param {string} configPath
 */
export function readTestSpriteApiKeyFromTmpConfig(configPath) {
  if (!existsSync(configPath)) {
    return "";
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.executionArgs?.envs?.API_KEY ?? "";
  } catch {
    return "";
  }
}

/**
 * @param {string} configPath
 */
export function readTestSpriteApiKeyFromWorkspaceConfig(configPath) {
  if (!existsSync(configPath)) {
    return "";
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.apiKey ?? parsed?.executionArgs?.envs?.API_KEY ?? "";
  } catch {
    return "";
  }
}

/**
 * @param {{
 *   rootDir: string,
 *   processEnv?: NodeJS.ProcessEnv,
 *   nodeEnv?: string,
 *   allowTmpConfigFallback?: boolean,
 * }} options
 */
export function resolveTestSpriteApiKey({
  rootDir,
  processEnv = process.env,
  nodeEnv = processEnv.NODE_ENV ?? "development",
  allowTmpConfigFallback = processEnv.TESTSPRITE_ALLOW_TMP_CONFIG_FALLBACK === "true",
} = {}) {
  const envEntries = loadTestSpriteEnv(rootDir, nodeEnv);
  const testspriteTmpConfigPath = path.join(rootDir, testspriteTmpConfigRelativePath);
  const testspriteWorkspaceConfigPath = path.join(rootDir, testspriteWorkspaceConfigRelativePath);

  const candidates = [
    {
      value: processEnv.TESTSPRITE_API_KEY,
      source: "process.env.TESTSPRITE_API_KEY",
    },
    {
      value: envEntries.get("TESTSPRITE_API_KEY"),
      source: `env files (${nodeEnv})`,
    },
    {
      value: processEnv.API_KEY,
      source: "process.env.API_KEY",
    },
    {
      value: readTestSpriteApiKeyFromWorkspaceConfig(testspriteWorkspaceConfigPath),
      source: `workspace profile (${testspriteWorkspaceConfigRelativePath})`,
    },
    {
      value:
        allowTmpConfigFallback
          ? readTestSpriteApiKeyFromTmpConfig(testspriteTmpConfigPath)
          : "",
      source: `tmp config fallback (${testspriteTmpConfigRelativePath})`,
    },
  ];

  const match = candidates.find((candidate) => candidate.value && String(candidate.value).trim());

  return {
    apiKey: match?.value?.trim?.() ?? "",
    source: match?.source ?? null,
    envEntries,
    nodeEnv,
    allowTmpConfigFallback,
    testspriteTmpConfigPath,
    testspriteWorkspaceConfigPath,
  };
}

/**
 * @param {{
 *   rootDir: string,
 *   processEnv?: NodeJS.ProcessEnv,
 *   nodeEnv?: string,
 * }} options
 */
export function resolveTestSpriteProjectEnv({
  rootDir,
  processEnv = process.env,
  nodeEnv = processEnv.NODE_ENV ?? "development",
} = {}) {
  const envEntries = loadTestSpriteEnv(rootDir, nodeEnv);

  return {
    envEntries,
    nodeEnv,
    projectName:
      processEnv.TESTSPRITE_PROJECT_NAME ||
      envEntries.get("TESTSPRITE_PROJECT_NAME") ||
      null,
    projectUrl:
      processEnv.TESTSPRITE_PROJECT_URL ||
      processEnv.PLAYWRIGHT_BASE_URL ||
      envEntries.get("TESTSPRITE_PROJECT_URL") ||
      envEntries.get("PLAYWRIGHT_BASE_URL") ||
      envEntries.get("NEXT_PUBLIC_APP_URL") ||
      null,
    projectInstruction:
      processEnv.TESTSPRITE_PROJECT_INSTRUCTION ||
      envEntries.get("TESTSPRITE_PROJECT_INSTRUCTION") ||
      null,
    smokeEmail:
      processEnv.PLAYWRIGHT_SMOKE_EMAIL ||
      envEntries.get("PLAYWRIGHT_SMOKE_EMAIL") ||
      null,
    smokePassword:
      processEnv.PLAYWRIGHT_SMOKE_PASSWORD ||
      envEntries.get("PLAYWRIGHT_SMOKE_PASSWORD") ||
      null,
  };
}

/**
 * @param {string} rootDir
 * @param {NodeJS.ProcessEnv} [processEnv]
 */
export function buildTestSpriteWorkspaceEnv(rootDir, processEnv = process.env) {
  const testspriteHome = path.join(rootDir, ".testsprite-home");

  return {
    ...processEnv,
    HOME: testspriteHome,
    XDG_CONFIG_HOME: path.join(testspriteHome, ".config"),
    XDG_CACHE_HOME: path.join(testspriteHome, ".cache"),
  };
}

/**
 * @param {string} contents
 */
export function parseInlineEnvContent(contents) {
  return parseEnvContent(contents);
}
