import { createClient } from "@insforge/sdk";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type PreviewAccessClaims = {
  subject: string | null;
  email: string | null;
  role: string | null;
  scopes: string[];
};

type PreviewAccessDecision = {
  allowed: boolean;
  reason?: string;
};

let cachedJwksUrl: string | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const PREVIEW_PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/agents",
  "/marketplace",
  "/paraphrase",
  "/ai-detector",
  "/humanize-gpt",
  "/plagiarism-checker",
  "/grammar-checker",
  "/summarize",
  "/translator",
  "/agent-studio",
  "/creative-studio",
]);

const PREVIEW_PUBLIC_PREFIXES = ["/books", "/community"] as const;

const PREVIEW_PUBLIC_API_PATTERNS = [
  /^\/api\/books\/published(?:\/.*)?$/,
  /^\/api\/books\/[^/]+\/access$/,
];

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function parseList(raw: string | undefined, separator = /[\s,]+/) {
  return (raw ?? "")
    .split(separator)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseScopes(...values: unknown[]) {
  const scopes = new Set<string>();

  for (const value of values) {
    if (typeof value === "string") {
      for (const item of value.split(/[\s,]+/)) {
        const normalized = item.trim().toLowerCase();
        if (normalized) scopes.add(normalized);
      }
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0) {
          scopes.add(item.trim().toLowerCase());
        }
      }
    }
  }

  return [...scopes];
}

function mergeScopes(...collections: string[][]) {
  const scopes = new Set<string>();

  for (const collection of collections) {
    for (const scope of collection) {
      const normalized = scope.trim().toLowerCase();
      if (normalized) scopes.add(normalized);
    }
  }

  return [...scopes];
}

function getPreviewJwks(env: NodeJS.ProcessEnv) {
  const baseUrl = env.NEXT_PUBLIC_INSFORGE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const jwksUrl = new URL("/.well-known/jwks.json", baseUrl).toString();
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwksUrl = jwksUrl;
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  return cachedJwks;
}

export function isPreviewAuthEnabled(env: NodeJS.ProcessEnv = process.env) {
  const override = env.PREVIEW_AUTH_ENABLED?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return env.VERCEL_ENV === "preview";
}

export function isPreviewBypassPath(pathname: string) {
  if (
    PREVIEW_PUBLIC_EXACT_PATHS.has(pathname) ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  if (
    PREVIEW_PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  if (PREVIEW_PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  return [
    "/_next",
    "/auth",
    "/api/auth",
    "/api/.well-known",
    "/api/health",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function extractPreviewAccessClaims(payload: JWTPayload): PreviewAccessClaims {
  const appMetadata =
    readRecord(payload.app_metadata) ??
    readRecord(payload.appMetadata) ??
    null;
  const userMetadata =
    readRecord(payload.user_metadata) ??
    readRecord(payload.userMetadata) ??
    readRecord(payload.metadata) ??
    null;

  return {
    subject: readString(payload.sub),
    email: readString(payload.email, userMetadata?.email),
    role: readString(
      payload.role,
      payload.user_role,
      appMetadata?.role,
      userMetadata?.role,
    ),
    scopes: parseScopes(
      payload.scope,
      payload.scp,
      payload.scopes,
      payload.permissions,
      appMetadata?.scopes,
      appMetadata?.permissions,
      userMetadata?.scopes,
      userMetadata?.permissions,
    ),
  };
}

async function loadCurrentUserClaims(
  token: string,
  env: NodeJS.ProcessEnv,
): Promise<
  | {
      valid: true;
      claims: PreviewAccessClaims;
    }
  | {
      valid: false;
      error: string;
    }
> {
  const baseUrl = env.NEXT_PUBLIC_INSFORGE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_INSFORGE_ANON_KEY?.trim();

  if (!baseUrl || !anonKey) {
    return { valid: false, error: "missing_preview_user_lookup_config" };
  }

  const client = createClient({
    baseUrl,
    anonKey,
    accessToken: token,
  });
  const { data, error } = await client.auth.getCurrentUser();

  if (error || !data?.user) {
    return {
      valid: false,
      error: error?.message ?? "preview_user_lookup_failed",
    };
  }

  const metadata = readRecord(data.user.metadata);
  const profile = readRecord(data.user.profile);

  return {
    valid: true,
    claims: {
      subject: readString(data.user.id),
      email: readString(data.user.email, profile?.email),
      role: readString(metadata?.role, profile?.role),
      scopes: parseScopes(
        metadata?.scope,
        metadata?.scp,
        metadata?.scopes,
        metadata?.permissions,
        profile?.scope,
        profile?.scp,
        profile?.scopes,
        profile?.permissions,
      ),
    },
  };
}

export function evaluatePreviewAccess(
  claims: PreviewAccessClaims,
  env: NodeJS.ProcessEnv = process.env,
): PreviewAccessDecision {
  if (!claims.subject) {
    return { allowed: false, reason: "missing_subject" };
  }

  if (!claims.email) {
    return { allowed: false, reason: "missing_email" };
  }

  const normalizedRole = claims.role?.toLowerCase() ?? null;
  if (normalizedRole === "anon") {
    return { allowed: false, reason: "anonymous_role" };
  }

  const allowedEmails = parseList(env.PREVIEW_ACCESS_ALLOWED_EMAILS, /[,\n]+/);
  if (allowedEmails.length > 0 && !allowedEmails.includes(claims.email.toLowerCase())) {
    return { allowed: false, reason: "email_not_allowlisted" };
  }

  const allowedRoles = parseList(env.PREVIEW_ACCESS_ALLOWED_ROLES, /[,\n]+/);
  if (allowedRoles.length > 0 && (!normalizedRole || !allowedRoles.includes(normalizedRole))) {
    return { allowed: false, reason: "role_not_allowed" };
  }

  const requiredScopes = parseList(env.PREVIEW_ACCESS_REQUIRED_SCOPES);
  if (
    requiredScopes.length > 0 &&
    !requiredScopes.some((scope) => claims.scopes.includes(scope))
  ) {
    return { allowed: false, reason: "missing_required_scope" };
  }

  return { allowed: true };
}

export async function verifyPreviewAccessToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<
  | { valid: true; claims: PreviewAccessClaims }
  | { valid: false; error: string }
> {
  const jwks = getPreviewJwks(env);
  if (!jwks) {
    return { valid: false, error: "missing_preview_jwks" };
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["RS256"],
    });
    const currentUserResult = await loadCurrentUserClaims(token, env);
    if (currentUserResult.valid === false) {
      return {
        valid: false,
        error: currentUserResult.error,
      };
    }

    const tokenClaims = extractPreviewAccessClaims(payload);

    return {
      valid: true,
      claims: {
        subject: tokenClaims.subject ?? currentUserResult.claims.subject,
        email: tokenClaims.email ?? currentUserResult.claims.email,
        role: tokenClaims.role ?? currentUserResult.claims.role,
        scopes: mergeScopes(tokenClaims.scopes, currentUserResult.claims.scopes),
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "preview_token_verification_failed",
    };
  }
}
