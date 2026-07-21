// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { importSPKI, jwtVerify } from "jose";
import {
  createAuthenticatedConvexClient,
  deriveConvexJwtPublicKeyModulus,
  getConvexSiteUrl,
  mintConvexAccessToken,
  resetConvexAuthKeyCacheForTest,
} from "@/lib/convex-auth";

describe("convex auth recovery helpers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CONVEX_SITE_URL;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.JWT_PRIVATE_KEY;
    resetConvexAuthKeyCacheForTest();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConvexAuthKeyCacheForTest();
  });

  it("derives the Convex site URL from the cloud URL when needed", () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://dashing-mandrill-233.convex.cloud";

    expect(getConvexSiteUrl()).toBe("https://dashing-mandrill-233.convex.site");
  });

  it("mints a token and derives the matching JWKS modulus from JWT_PRIVATE_KEY", async () => {
    const { privateKey, publicKey } = generatePemKeyPair();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://dashing-mandrill-233.convex.cloud";
    process.env.JWT_PRIVATE_KEY = privateKey;

    const token = await mintConvexAccessToken({
      id: "user_123",
      email: "writer@example.com",
      name: "Writer",
    });

    const modulus = await deriveConvexJwtPublicKeyModulus();
    const verificationKey = await importSPKI(publicKey, "RS256");
    const { payload, protectedHeader } = await jwtVerify(token, verificationKey, {
      issuer: "https://dashing-mandrill-233.convex.site",
      audience: "shothik-publishing",
    });
    const spki = publicKey;

    expect(payload.sub).toBe("user_123");
    expect(payload.email).toBe("writer@example.com");
    expect(protectedHeader.kid).toBe("shothik-convex-1");
    expect(modulus.length).toBeGreaterThan(10);
    expect(spki).toContain("BEGIN PUBLIC KEY");
  });

  it("accepts quoted multiline private keys from .env.local formatting", async () => {
    const { privateKey } = generatePemKeyPair();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://dashing-mandrill-233.convex.cloud";
    process.env.JWT_PRIVATE_KEY = JSON.stringify(privateKey);

    const token = await mintConvexAccessToken({
      id: "quoted_user",
    });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("creates an authenticated Convex client when the runtime env is present", async () => {
    const { privateKey } = generatePemKeyPair();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://dashing-mandrill-233.convex.cloud";
    process.env.JWT_PRIVATE_KEY = privateKey;

    const client = await createAuthenticatedConvexClient({
      id: "user_123",
    });

    expect(client).toBeTruthy();
  });
});

function generatePemKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  return { privateKey, publicKey };
}
