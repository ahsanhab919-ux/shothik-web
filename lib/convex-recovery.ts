import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { deriveConvexJwtPublicKeyModulus, getConvexSiteUrl } from "@/lib/convex-auth";

const execFileAsync = promisify(execFile);

export type ConvexRecoveryConfig = {
  rootDir: string;
  deployment: string;
  cloudUrl: string;
  siteUrl: string;
  deployKey: string | null;
  jwtPrivateKey: string | null;
  convexJwtPublicKeyN: string | null;
  functionsDir: string;
  schemaPath: string;
  generatedApiPath: string;
};

export type ConvexRecoveryCheck = {
  name: string;
  ok: boolean;
  status?: number;
  detail: string;
};

export type ConvexRecoveryOptions = {
  rootDir?: string;
  dryRun?: boolean;
  forceEnvSync?: boolean;
  skipEnvSync?: boolean;
  skipDeploy?: boolean;
  fetchImpl?: typeof fetch;
  execFileImpl?: typeof execFileAsync;
};

export type ConvexRecoveryResult = {
  config: ConvexRecoveryConfig;
  envSync: {
    updated: boolean;
    envFilePath: string | null;
    command: string[] | null;
  };
  deploy: {
    attempted: boolean;
    command: string[] | null;
    stdout: string;
    stderr: string;
  };
  checks: ConvexRecoveryCheck[];
};

type CommandExecutionError = Error & {
  stderr?: string;
  stdout?: string;
  cmd?: string;
};

function trimToNull(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveConvexRecoveryConfig(
  env: NodeJS.ProcessEnv = process.env,
  rootDir = process.cwd(),
): ConvexRecoveryConfig {
  const cloudUrl =
    trimToNull(env.NEXT_PUBLIC_CONVEX_URL) ??
    trimToNull(env.CONVEX_URL) ??
    trimToNull(env.CONVEX_EXPECTED_CLOUD_URL);
  const deployment = trimToNull(env.CONVEX_DEPLOYMENT);

  if (!cloudUrl) {
    throw new Error(
      "A Convex cloud URL is required for Convex recovery (NEXT_PUBLIC_CONVEX_URL, CONVEX_URL, or CONVEX_EXPECTED_CLOUD_URL).",
    );
  }

  if (!deployment) {
    throw new Error("CONVEX_DEPLOYMENT is required for Convex recovery.");
  }

  return {
    rootDir,
    deployment,
    cloudUrl,
    siteUrl: getConvexSiteUrl(),
    deployKey: trimToNull(env.CONVEX_DEPLOY_KEY),
    jwtPrivateKey: trimToNull(env.JWT_PRIVATE_KEY),
    convexJwtPublicKeyN: trimToNull(env.CONVEX_JWT_PUBLIC_KEY_N),
    functionsDir: path.join(rootDir, "convex"),
    schemaPath: path.join(rootDir, "convex", "schema.ts"),
    generatedApiPath: path.join(rootDir, "convex", "_generated", "api.d.ts"),
  };
}

export async function assertConvexRecoveryAssets(config: ConvexRecoveryConfig) {
  const requiredPaths = [
    config.functionsDir,
    config.schemaPath,
    config.generatedApiPath,
    path.join(config.rootDir, "convex.json"),
  ];

  await Promise.all(
    requiredPaths.map(async (targetPath) => {
      await access(targetPath);
    }),
  );
}

export async function buildConvexRecoveryEnvValues(config: ConvexRecoveryConfig) {
  const convexJwtPublicKeyN =
    config.convexJwtPublicKeyN ?? (config.jwtPrivateKey ? await deriveConvexJwtPublicKeyModulus() : null);

  return {
    ...(convexJwtPublicKeyN ? { CONVEX_JWT_PUBLIC_KEY_N: convexJwtPublicKeyN } : {}),
  };
}

function formatConvexEnvSyncError(error: unknown) {
  const commandError = error as CommandExecutionError;
  const stderr = commandError.stderr ?? "";

  if (!/deployment:env:view/i.test(stderr)) {
    return error;
  }

  const guidance = [
    "Convex env sync failed because the current credentials cannot access deployment environment variables.",
    "If the required deployment env is already configured, rerun `pnpm recover:convex --skip-env-sync`.",
    "Otherwise, update the Convex deployment env with an identity that has deployment env permissions and retry.",
  ].join(" ");

  const detail = stderr.trim() || commandError.message;
  return new Error(`${guidance}\n\nConvex CLI output:\n${detail}`);
}

async function withRecoveryEnvFile(
  values: Record<string, string>,
  callback: (envFilePath: string) => Promise<ConvexRecoveryResult["envSync"]>,
) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "shothik-convex-recovery-"));
  const envFilePath = path.join(tempDir, ".env.convex-recovery");

  try {
    const fileContents = Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await writeFile(envFilePath, `${fileContents}\n`, "utf8");
    return await callback(envFilePath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function checkConvexCloudEndpoint(
  config: ConvexRecoveryConfig,
  fetchImpl: typeof fetch = fetch,
) {
  let response: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(config.cloudUrl, { method: "GET" });
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  if (!response) {
    return {
      name: "cloud-endpoint",
      ok: false,
      detail: lastError?.message ?? "Convex cloud endpoint did not respond.",
    } satisfies ConvexRecoveryCheck;
  }

  const body = await response.text();
  const ok =
    response.ok &&
    /deployment is running|all clear|convex/i.test(body);

  return {
    name: "cloud-endpoint",
    ok,
    status: response.status,
    detail: ok ? "Convex cloud endpoint is reachable." : body.slice(0, 200),
  } satisfies ConvexRecoveryCheck;
}

export async function checkConvexOpenIdConfiguration(
  config: ConvexRecoveryConfig,
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(`${config.siteUrl}/.well-known/openid-configuration`, {
    method: "GET",
  });
  const payload = await response.json().catch(() => null);
  const issuer = payload?.issuer;
  const ok = response.ok && issuer === config.siteUrl;

  return {
    name: "openid-configuration",
    ok,
    status: response.status,
    detail: ok ? "OpenID configuration points to the expected Convex site URL." : JSON.stringify(payload),
  } satisfies ConvexRecoveryCheck;
}

export async function checkConvexJwksDocument(
  config: ConvexRecoveryConfig,
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(`${config.siteUrl}/.well-known/jwks.json`, {
    method: "GET",
  });
  const payload = await response.json().catch(() => null);
  const key = Array.isArray(payload?.keys) ? payload.keys[0] : null;
  const ok = response.ok && typeof key?.n === "string" && key.n.length > 0;

  return {
    name: "jwks",
    ok,
    status: response.status,
    detail: ok ? "JWKS document contains an RSA modulus." : JSON.stringify(payload),
  } satisfies ConvexRecoveryCheck;
}

export function buildConvexEnvSetCommand(
  config: ConvexRecoveryConfig,
  envFilePath: string,
  force = false,
) {
  const command = ["pnpm", "exec", "convex", "env", "set"];

  // Convex rejects `--deployment` when a deploy key is already selecting
  // the target deployment through the environment.
  if (!config.deployKey) {
    command.push("--deployment", config.deployment);
  }

  command.push("--from-file", envFilePath);

  if (force) {
    command.push("--force");
  }

  return command;
}

export function buildConvexDeployCommand(_config: ConvexRecoveryConfig, dryRun = false) {
  const command = [
    "pnpm",
    "exec",
    "convex",
    "deploy",
    "--typecheck",
    "enable",
    "--codegen",
    "enable",
  ];

  if (dryRun) {
    command.push("--dry-run");
  }

  return command;
}

async function runCommand(
  command: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; execFileImpl?: typeof execFileAsync },
) {
  const [file, ...args] = command;
  const runner = options.execFileImpl ?? execFileAsync;
  return runner(file, args, {
    cwd: options.cwd,
    env: options.env,
    maxBuffer: 1024 * 1024 * 10,
  });
}

export async function runConvexRecovery(
  options: ConvexRecoveryOptions = {},
): Promise<ConvexRecoveryResult> {
  const config = resolveConvexRecoveryConfig(process.env, options.rootDir ?? process.cwd());
  if (!config.jwtPrivateKey) {
    throw new Error("JWT_PRIVATE_KEY is required to recover the Convex compatibility auth path.");
  }
  await assertConvexRecoveryAssets(config);

  const envValues = await buildConvexRecoveryEnvValues(config);
  const checks: ConvexRecoveryCheck[] = [];

  const envSync =
    options.skipEnvSync || Object.keys(envValues).length === 0
      ? {
          updated: false,
          envFilePath: null,
          command: null,
        }
      : await withRecoveryEnvFile(envValues, async (envFilePath) => {
          const command = buildConvexEnvSetCommand(config, envFilePath, options.forceEnvSync);

          if (options.dryRun) {
            return {
              updated: false,
              envFilePath: null,
              command,
            };
          }

          try {
            await runCommand(command, {
              cwd: config.rootDir,
              execFileImpl: options.execFileImpl,
              env: process.env,
            });
          } catch (error) {
            throw formatConvexEnvSyncError(error);
          }

          return {
            updated: true,
            envFilePath: null,
            command,
          };
        });

  checks.push(await checkConvexCloudEndpoint(config, options.fetchImpl));

  const deployCommand = options.skipDeploy ? null : buildConvexDeployCommand(config, options.dryRun);
  let deployStdout = "";
  let deployStderr = "";

  if (deployCommand) {
    const deployResult = await runCommand(deployCommand, {
      cwd: config.rootDir,
      execFileImpl: options.execFileImpl,
      env: process.env,
    });
    deployStdout = deployResult.stdout;
    deployStderr = deployResult.stderr;
  }

  checks.push(await checkConvexOpenIdConfiguration(config, options.fetchImpl));
  checks.push(await checkConvexJwksDocument(config, options.fetchImpl));

  return {
    config,
    envSync,
    deploy: {
      attempted: Boolean(deployCommand),
      command: deployCommand,
      stdout: deployStdout,
      stderr: deployStderr,
    },
    checks,
  };
}

export async function loadEnvFileIfPresent(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
