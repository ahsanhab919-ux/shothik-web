import path from "node:path";
import { z } from "zod";

const E2EEnvSchema = z.object({
  PLAYWRIGHT_BASE_URL: z.string().url().optional(),
  PLAYWRIGHT_SMOKE_EMAIL: z.string().email().optional(),
  PLAYWRIGHT_SMOKE_PASSWORD: z.string().min(1).optional(),
  PLAYWRIGHT_VERCEL_PROTECTION_BYPASS: z.string().min(1).optional(),
  PLAYWRIGHT_STORAGE_STATE_PATH: z.string().min(1).optional(),
  PLAYWRIGHT_USE_AUTH_SETUP: z.enum(["true", "false"]).optional(),
  PREVIEW_ACCESS_ALLOWED_EMAILS: z.string().optional(),
  PREVIEW_ACCESS_ALLOWED_ROLES: z.string().optional(),
  PREVIEW_ACCESS_REQUIRED_SCOPES: z.string().optional(),
});

function parseList(raw: string | undefined, separator = /[,\n\s]+/) {
  return (raw ?? "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickE2EEnv(env: NodeJS.ProcessEnv) {
  return {
    PLAYWRIGHT_BASE_URL: env.PLAYWRIGHT_BASE_URL,
    PLAYWRIGHT_SMOKE_EMAIL: env.PLAYWRIGHT_SMOKE_EMAIL,
    PLAYWRIGHT_SMOKE_PASSWORD: env.PLAYWRIGHT_SMOKE_PASSWORD,
    PLAYWRIGHT_VERCEL_PROTECTION_BYPASS: env.PLAYWRIGHT_VERCEL_PROTECTION_BYPASS,
    PLAYWRIGHT_STORAGE_STATE_PATH: env.PLAYWRIGHT_STORAGE_STATE_PATH,
    PLAYWRIGHT_USE_AUTH_SETUP: env.PLAYWRIGHT_USE_AUTH_SETUP,
    PREVIEW_ACCESS_ALLOWED_EMAILS: env.PREVIEW_ACCESS_ALLOWED_EMAILS,
    PREVIEW_ACCESS_ALLOWED_ROLES: env.PREVIEW_ACCESS_ALLOWED_ROLES,
    PREVIEW_ACCESS_REQUIRED_SCOPES: env.PREVIEW_ACCESS_REQUIRED_SCOPES,
  };
}

export type E2EAccessConfig = {
  baseURL: string;
  hostname: string;
  isRemote: boolean;
  requiresVercelBypass: boolean;
  vercelProtectionBypassToken: string | null;
  hasVercelBypass: boolean;
  smokeEmail: string | null;
  smokePassword: string | null;
  hasSmokeCredentials: boolean;
  storageStatePath: string;
  useAuthSetup: boolean;
  hasPreviewAccessRestrictions: boolean;
  previewAccess: {
    allowedEmails: string[];
    allowedRoles: string[];
    requiredScopes: string[];
  };
};

export function getE2EAccessConfig(env: NodeJS.ProcessEnv = process.env): E2EAccessConfig {
  const parsed = E2EEnvSchema.parse(pickE2EEnv(env));
  const baseURL = parsed.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";
  const base = new URL(baseURL);
  const smokeEmail = parsed.PLAYWRIGHT_SMOKE_EMAIL?.trim() || null;
  const smokePassword = parsed.PLAYWRIGHT_SMOKE_PASSWORD?.trim() || null;
  const vercelProtectionBypassToken =
    parsed.PLAYWRIGHT_VERCEL_PROTECTION_BYPASS?.trim() || null;
  const previewAccess = {
    allowedEmails: parseList(parsed.PREVIEW_ACCESS_ALLOWED_EMAILS).map((item) => item.toLowerCase()),
    allowedRoles: parseList(parsed.PREVIEW_ACCESS_ALLOWED_ROLES).map((item) => item.toLowerCase()),
    requiredScopes: parseList(parsed.PREVIEW_ACCESS_REQUIRED_SCOPES).map((item) => item.toLowerCase()),
  };
  const storageStatePath = path.resolve(
    process.cwd(),
    parsed.PLAYWRIGHT_STORAGE_STATE_PATH?.trim() || ".playwright/.auth/smoke-user.json",
  );

  return {
    baseURL,
    hostname: base.hostname,
    isRemote: Boolean(parsed.PLAYWRIGHT_BASE_URL?.trim()),
    requiresVercelBypass: base.hostname.endsWith(".vercel.app"),
    vercelProtectionBypassToken,
    hasVercelBypass: Boolean(vercelProtectionBypassToken),
    smokeEmail,
    smokePassword,
    hasSmokeCredentials: Boolean(smokeEmail && smokePassword),
    storageStatePath,
    useAuthSetup: parsed.PLAYWRIGHT_USE_AUTH_SETUP === "true",
    hasPreviewAccessRestrictions:
      previewAccess.allowedEmails.length > 0 ||
      previewAccess.allowedRoles.length > 0 ||
      previewAccess.requiredScopes.length > 0,
    previewAccess,
  };
}

export function resolveOptionalStorageStatePath(env: NodeJS.ProcessEnv = process.env) {
  const config = getE2EAccessConfig(env);
  return config.useAuthSetup ? config.storageStatePath : undefined;
}

export function getVercelProtectionHeaders(env: NodeJS.ProcessEnv = process.env) {
  const config = getE2EAccessConfig(env);
  if (!config.vercelProtectionBypassToken) {
    return undefined;
  }

  return {
    "x-vercel-protection-bypass": config.vercelProtectionBypassToken,
    "x-vercel-set-bypass-cookie": "true",
  };
}

export function getE2EAccessIssues(
  config: E2EAccessConfig,
  options: {
    requireAuth?: boolean;
    requireRemoteBrowserAccess?: boolean;
  } = {},
) {
  const issues: string[] = [];

  if (options.requireAuth && !config.hasSmokeCredentials) {
    issues.push("PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD are required.");
  }

  if (options.requireRemoteBrowserAccess && config.requiresVercelBypass && !config.hasVercelBypass) {
    issues.push(
      "PLAYWRIGHT_VERCEL_PROTECTION_BYPASS is required for browser automation against protected Vercel preview domains.",
    );
  }

  if (
    options.requireAuth &&
    config.previewAccess.allowedEmails.length > 0 &&
    config.smokeEmail &&
    !config.previewAccess.allowedEmails.includes(config.smokeEmail.toLowerCase())
  ) {
    issues.push(
      "PLAYWRIGHT_SMOKE_EMAIL must be included in PREVIEW_ACCESS_ALLOWED_EMAILS for protected preview automation.",
    );
  }

  return issues;
}
