import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveTestSpriteProjectEnv } from "./lib/testsprite-env.mjs";

export const DEFAULT_BASE_URL = "https://www.shothikgpt.com";
export const DEFAULT_BROWSER = "chrome-stable";
export const DEFAULT_REPEAT_EACH = "1";
export const DEFAULT_BROWSER_MATRIX = ["chrome-stable", "firefox-stable", "safari-webkit"];
export const SUPPORTED_BROWSER_PROJECTS = [
  "chrome-stable",
  "chromium",
  "firefox-stable",
  "safari-webkit",
  "edge-stable",
];

export function getRunnerRootDir() {
  if (typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  }

  return process.cwd();
}

export function parseArgs(argv, env = process.env) {
  const args = {
    baseUrl: env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,
    browser: env.PLAYWRIGHT_BROWSER || DEFAULT_BROWSER,
    repeatEach: env.PLAYWRIGHT_REPEAT_EACH || DEFAULT_REPEAT_EACH,
    headed: false,
    extraArgs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--") {
      continue;
    }

    if (current === "--base-url") {
      args.baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === "--browser") {
      args.browser = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === "--all-browsers") {
      args.allBrowsers = true;
      continue;
    }

    if (current === "--repeat-each") {
      args.repeatEach = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === "--headed") {
      args.headed = true;
      continue;
    }

    if (current === "--help" || current === "-h") {
      args.help = true;
      return args;
    }

    args.extraArgs.push(current);
  }

  return args;
}

export function getHelpText() {
  return `
Usage:
  node scripts/run-login-validation.mjs [options] [-- <additional-playwright-args>]

Options:
  --base-url <url>       Target app base URL. Defaults to ${DEFAULT_BASE_URL}
  --browser <project>    Playwright project name or comma-separated project list. Defaults to ${DEFAULT_BROWSER}
  --all-browsers         Run the default browser matrix: ${DEFAULT_BROWSER_MATRIX.join(", ")}
  --repeat-each <count>  Consecutive repeat count. Defaults to ${DEFAULT_REPEAT_EACH}
  --headed               Launch in headed mode
  --help                 Show this help text

Environment:
  PLAYWRIGHT_SMOKE_EMAIL      Optional successful-login email
  PLAYWRIGHT_SMOKE_PASSWORD   Optional successful-login password
  PLAYWRIGHT_VERCEL_PROTECTION_BYPASS  Optional Vercel preview bypass token

Examples:
  node scripts/run-login-validation.mjs --repeat-each 2
  node scripts/run-login-validation.mjs --all-browsers --repeat-each 2
  PLAYWRIGHT_SMOKE_EMAIL='user@example.com' PLAYWRIGHT_SMOKE_PASSWORD='secret' \\
    node scripts/run-login-validation.mjs --headed --browser chrome-stable
`;
}

export function assertValidUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    if (!/^https?:$/.test(url.protocol)) {
      throw new Error("Base URL must use http or https.");
    }
  } catch (error) {
    throw new Error(`Invalid --base-url value "${baseUrl}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function assertRepeatEach(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new Error(`Invalid --repeat-each value "${value}". Expected an integer >= 1.`);
  }
}

export function isPlaceholder(value) {
  if (!value) return false;
  return ["your-smoke-user@example.com", "your-password", "example.com"].some((fragment) => value.includes(fragment));
}

export function validateCredentialEnv(env = process.env) {
  const email = env.PLAYWRIGHT_SMOKE_EMAIL;
  const password = env.PLAYWRIGHT_SMOKE_PASSWORD;

  if (!email && !password) {
    return {
      hasCredentials: false,
      message: "Info: smoke credentials are not set; the successful-login scenario will be skipped.",
    };
  }

  if (!email || !password) {
    throw new Error("Both PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD must be set together.");
  }

  if (isPlaceholder(email) || isPlaceholder(password)) {
    throw new Error("Placeholder smoke credentials detected. Replace them with a real authorized test account.");
  }

  return {
    hasCredentials: true,
    message: "Info: smoke credentials detected; the successful-login scenario will run.",
  };
}

export function resolveRunnerProcessEnv({
  rootDir = getRunnerRootDir(),
  processEnv = process.env,
  nodeEnv = processEnv.NODE_ENV ?? "development",
} = {}) {
  const resolvedProjectEnv = resolveTestSpriteProjectEnv({
    rootDir,
    processEnv,
    nodeEnv,
  });

  return {
    ...processEnv,
    PLAYWRIGHT_BASE_URL:
      processEnv.PLAYWRIGHT_BASE_URL ||
      resolvedProjectEnv.projectUrl ||
      DEFAULT_BASE_URL,
    PLAYWRIGHT_SMOKE_EMAIL:
      processEnv.PLAYWRIGHT_SMOKE_EMAIL ||
      resolvedProjectEnv.smokeEmail ||
      "",
    PLAYWRIGHT_SMOKE_PASSWORD:
      processEnv.PLAYWRIGHT_SMOKE_PASSWORD ||
      resolvedProjectEnv.smokePassword ||
      "",
  };
}

export function resolveBrowserProjects(args) {
  const requested = args.allBrowsers
    ? DEFAULT_BROWSER_MATRIX
    : String(args.browser)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  if (requested.length === 0) {
    throw new Error("At least one Playwright browser project must be specified.");
  }

  const invalid = requested.filter((project) => !SUPPORTED_BROWSER_PROJECTS.includes(project));
  if (invalid.length > 0) {
    throw new Error(
      `Unsupported browser project(s): ${invalid.join(", ")}. Supported values: ${SUPPORTED_BROWSER_PROJECTS.join(", ")}.`,
    );
  }

  return [...new Set(requested)];
}

export function buildPlaywrightArgs(args) {
  const browserProjects = resolveBrowserProjects(args);

  return [
    "exec",
    "playwright",
    "test",
    "e2e/login-validation.spec.ts",
    ...browserProjects.map((project) => `--project=${project}`),
    `--repeat-each=${args.repeatEach}`,
    ...(args.headed ? ["--headed"] : []),
    ...args.extraArgs,
  ];
}

export function buildRunnerEnv(args, env = process.env) {
  return {
    ...env,
    PLAYWRIGHT_BASE_URL: args.baseUrl,
    PLAYWRIGHT_HTML_OPEN: "never",
    PLAYWRIGHT_BROWSERS_PATH: env.PLAYWRIGHT_BROWSERS_PATH || ".playwright-browsers",
  };
}

export function createRunnerConfig(argv, processEnv = process.env, options = {}) {
  const initialArgs = parseArgs(argv, processEnv);
  if (initialArgs.help) {
    return { help: true, helpText: getHelpText() };
  }

  const resolvedEnv = resolveRunnerProcessEnv({
    rootDir: options.rootDir ?? getRunnerRootDir(),
    processEnv,
    nodeEnv: options.nodeEnv ?? processEnv.NODE_ENV ?? "development",
  });
  const args = parseArgs(argv, resolvedEnv);

  assertValidUrl(args.baseUrl);
  assertRepeatEach(args.repeatEach);
  const credentialStatus = validateCredentialEnv(resolvedEnv);
  const browserProjects = resolveBrowserProjects(args);

  return {
    help: false,
    args,
    browserProjects,
    credentialStatus,
    env: buildRunnerEnv(args, resolvedEnv),
    playwrightArgs: buildPlaywrightArgs(args),
  };
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function main() {
  const config = createRunnerConfig(process.argv.slice(2), process.env, {
    rootDir: getRunnerRootDir(),
  });
  if (config.help) {
    console.log(config.helpText);
    return;
  }

  console.log(config.credentialStatus.message);
  console.log(`Running login validation against ${config.args.baseUrl}`);
  console.log(`Browser project${config.browserProjects.length > 1 ? "s" : ""}: ${config.browserProjects.join(", ")}`);
  console.log(`Repeat each: ${config.args.repeatEach}`);
  console.log(`Mode: ${config.args.headed ? "headed" : "headless"}`);

  const child = spawn("pnpm", config.playwrightArgs, {
    stdio: "inherit",
    env: config.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
