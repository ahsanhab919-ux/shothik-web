#!/usr/bin/env node

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { resolveTestSpriteApiKey } from "./lib/testsprite-env.mjs";

const projectRoot = process.cwd();
const testspriteHome = join(projectRoot, ".testsprite-home");
const xdgConfigHome = join(testspriteHome, ".config");
const xdgCacheHome = join(testspriteHome, ".cache");
const preferencesHome = join(
  testspriteHome,
  "Library",
  "Preferences",
  "@testsprite",
  "testsprite-mcp-nodejs",
);
const executionLockPath = join(projectRoot, "testsprite_tests", "tmp", "execution.lock");

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function readLockFile() {
  if (!existsSync(executionLockPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(executionLockPath, "utf8"));
  } catch {
    return { unreadable: true };
  }
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function clearLock() {
  rmSync(executionLockPath, { force: true });
}

function printLockStatus() {
  const lock = readLockFile();

  if (!lock) {
    console.log("No TestSprite execution lock found.");
    return 0;
  }

  if (lock.unreadable) {
    console.log(`TestSprite lock exists but could not be parsed: ${executionLockPath}`);
    return 1;
  }

  const pid = Number(lock.pid);
  const running = isPidRunning(pid);

  console.log(`Lock file: ${executionLockPath}`);
  console.log(`PID: ${Number.isFinite(pid) ? pid : "unknown"}`);
  console.log(`Started: ${lock.startTime ?? "unknown"}`);
  console.log(`Function: ${lock.functionName ?? "unknown"}`);
  console.log(`Process running: ${running ? "yes" : "no"}`);

  return running ? 2 : 0;
}

function unlock({ force = false } = {}) {
  const lock = readLockFile();

  if (!lock) {
    console.log("No TestSprite execution lock found.");
    return 0;
  }

  if (lock.unreadable) {
    clearLock();
    console.log("Removed unreadable TestSprite execution lock.");
    return 0;
  }

  const pid = Number(lock.pid);
  const running = isPidRunning(pid);

  if (running && !force) {
    console.error(
      [
        `TestSprite is still running with PID ${pid}.`,
        "Use `pnpm testsprite:status` to confirm.",
        "Use `pnpm testsprite:unlock --force` only if you want to stop that run.",
      ].join(" "),
    );
    return 1;
  }

  if (running && force) {
    try {
      process.kill(pid, "SIGTERM");
      console.log(`Stopped active TestSprite process ${pid}.`);
    } catch (error) {
      console.error(`Failed to stop TestSprite process ${pid}: ${error.message}`);
      return 1;
    }
  }

  clearLock();
  console.log("Removed TestSprite execution lock.");
  return 0;
}

const command = process.argv[2] ?? "generateCodeAndExecute";
const forwardArgs = process.argv.slice(3);

if (command === "status") {
  process.exit(printLockStatus());
}

if (command === "unlock") {
  process.exit(unlock({ force: forwardArgs.includes("--force") }));
}

const { apiKey, allowTmpConfigFallback } = resolveTestSpriteApiKey({
  rootDir: projectRoot,
  processEnv: process.env,
});

if (!apiKey) {
  console.error(
    [
      "Missing TestSprite API key.",
      "Set TESTSPRITE_API_KEY in your shell, Trae MCP env config, .env.local, or .env.testsprite.local.",
      allowTmpConfigFallback
        ? "Temporary fallback from testsprite_tests/tmp/config.json is enabled for this run."
        : "Temporary fallback from testsprite_tests/tmp/config.json is disabled by default; enable it only with TESTSPRITE_ALLOW_TMP_CONFIG_FALLBACK=true for migration or recovery.",
    ].join(" "),
  );
  process.exit(1);
}

ensureDir(preferencesHome);
ensureDir(xdgConfigHome);
ensureDir(xdgCacheHome);

if (command === "generateCodeAndExecute") {
  const lock = readLockFile();

  if (lock?.unreadable) {
    clearLock();
  } else if (lock) {
    const pid = Number(lock.pid);

    if (isPidRunning(pid)) {
      console.error(
        [
          `TestSprite is already running with PID ${pid}.`,
          "Wait for it to finish or run `pnpm testsprite:unlock --force` to stop it.",
        ].join(" "),
      );
      process.exit(1);
    }

    clearLock();
  }
}

const result = spawnSync(
  "npx",
  ["-y", "@testsprite/testsprite-mcp@latest", command, ...forwardArgs],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      HOME: testspriteHome,
      XDG_CONFIG_HOME: xdgConfigHome,
      XDG_CACHE_HOME: xdgCacheHome,
      TESTSPRITE_API_KEY: apiKey,
      API_KEY: apiKey,
    },
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
