import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { runOwaspChecks } from "@/lib/security/owasp-compliance";

function makeRequest(path: string, init?: { headers?: Record<string, string> }) {
  return new NextRequest(`https://example.com${path}`, init);
}

describe("owasp compliance authentication checks", () => {
  it("allows public auth routes without an existing session", async () => {
    const result = await runOwaspChecks(makeRequest("/api/auth/sign-in"));

    expect(result.violations.find((violation) => violation.id === "API2")).toBeUndefined();
  });

  it("allows public planner routes without an existing session", async () => {
    const userLimitResult = await runOwaspChecks(makeRequest("/api/user-limit"));
    const bookAgentResult = await runOwaspChecks(
      makeRequest("/api/book-agent", {
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(userLimitResult.violations.find((violation) => violation.id === "API2")).toBeUndefined();
    expect(bookAgentResult.violations.find((violation) => violation.id === "API2")).toBeUndefined();
  });

  it("allows protected API routes when native InsForge cookies are present", async () => {
    const result = await runOwaspChecks(
      makeRequest("/api/chat/conversations", {
        headers: {
          cookie: "insforge_access_token=test-access-token",
        },
      }),
    );

    expect(result.violations.find((violation) => violation.id === "API2")).toBeUndefined();
  });

  it("blocks protected API routes when only legacy auth cookies are present", async () => {
    const result = await runOwaspChecks(
      makeRequest("/api/chat/conversations", {
        headers: {
          cookie: "__session=legacy-session; jwt_token=legacy-jwt",
        },
      }),
    );

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "API2",
          message: "Authentication required",
        }),
      ]),
    );
  });

  it("still blocks protected API routes with no authenticated session", async () => {
    const result = await runOwaspChecks(makeRequest("/api/chat/conversations"));

    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "API2",
          message: "Authentication required",
        }),
      ]),
    );
  });
});
