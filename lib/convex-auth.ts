import { createPrivateKey, type KeyObject } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { SignJWT } from "jose";

export type ConvexAuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

const CONVEX_AUTH_APPLICATION_ID = "shothik-publishing";
const CONVEX_AUTH_KEY_ID = "shothik-convex-1";

let cachedPrivateKey: KeyObject | null = null;

function getConvexCloudUrlFromEnv() {
  return (
    process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
    process.env.CONVEX_URL?.trim() ||
    process.env.CONVEX_EXPECTED_CLOUD_URL?.trim() ||
    ""
  );
}

export function getConvexSiteUrl(): string {
  if (process.env.CONVEX_SITE_URL) {
    return process.env.CONVEX_SITE_URL;
  }

  const cloudUrl = getConvexCloudUrlFromEnv();
  if (cloudUrl?.includes(".convex.cloud")) {
    return cloudUrl.replace(".convex.cloud", ".convex.site");
  }

  throw new Error(
    "CONVEX_SITE_URL is not set and cannot be derived from the configured Convex cloud URL.",
  );
}

function normalizePrivateKeyPem(rawValue: string) {
  const normalized = rawValue
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^'([\s\S]*)'$/, "$1")
    .replace(/\\\\r/g, "")
    .replace(/\\\\n/g, "\n")
    .replace(/\\\r?\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\$/gm, "")
    .trim();

  if (normalized.startsWith("-----BEGIN")) {
    return normalized;
  }

  return `-----BEGIN PRIVATE KEY-----\n${normalized}\n-----END PRIVATE KEY-----`;
}

function getPrivateKeyPemCandidates(rawValue: string) {
  const base = rawValue
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^'([\s\S]*)'$/, "$1")
    .trim();

  return Array.from(
    new Set([
      normalizePrivateKeyPem(base),
      normalizePrivateKeyPem(base.replace(/\\\\r/g, "").replace(/\\\\n/g, "\n")),
      normalizePrivateKeyPem(base.replace(/\\r/g, "").replace(/\\n/g, "\n")),
      normalizePrivateKeyPem(
        base
          .replace(/\\\\r/g, "")
          .replace(/\\\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\n/g, "\n"),
      ),
    ]),
  );
}

async function getConvexPrivateKey() {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const pemRaw = process.env.JWT_PRIVATE_KEY;
  if (!pemRaw) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set.");
  }

  let lastError: unknown = null;
  for (const candidate of getPrivateKeyPemCandidates(pemRaw)) {
    try {
      cachedPrivateKey = createPrivateKey(candidate);
      return cachedPrivateKey;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to parse JWT_PRIVATE_KEY.");
}

export function resetConvexAuthKeyCacheForTest() {
  cachedPrivateKey = null;
}

export async function mintConvexAccessToken(user: ConvexAuthUser) {
  const privateKey = await getConvexPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, string> = {
    sub: user.id,
  };

  if (user.email) {
    payload.email = user.email;
  }

  if (user.name) {
    payload.name = user.name;
  }

  return new SignJWT(payload)
    .setProtectedHeader({
      alg: "RS256",
      kid: CONVEX_AUTH_KEY_ID,
      typ: "JWT",
    })
    .setIssuer(getConvexSiteUrl())
    .setAudience(CONVEX_AUTH_APPLICATION_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

export async function createAuthenticatedConvexClient(user: ConvexAuthUser) {
  const convexUrl = getConvexCloudUrlFromEnv();
  if (!convexUrl) {
    throw new Error("A Convex cloud URL is required to create an authenticated client.");
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await mintConvexAccessToken(user));
  return client;
}

export async function deriveConvexJwtPublicKeyModulus() {
  const pemRaw = process.env.JWT_PRIVATE_KEY;
  if (!pemRaw) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set.");
  }

  const jwk = createPrivateKey(normalizePrivateKeyPem(pemRaw)).export({
    format: "jwk",
  }) as { n?: string };

  if (!jwk.n) {
    throw new Error("Unable to derive CONVEX_JWT_PUBLIC_KEY_N from JWT_PRIVATE_KEY.");
  }

  return jwk.n;
}
