import { describe, expect, it } from "vitest";

import {
  containsPII,
  generateAgentApiKey,
  hashAgentKey,
  isAgentKey,
  sanitizePII,
} from "../agent-auth";

describe("agent-auth", () => {
  it("generates an agent API key with consistent prefix and hash", () => {
    const { key, prefix, hash } = generateAgentApiKey();
    expect(isAgentKey(key)).toBe(true);
    expect(prefix).toBe(key.slice(0, 22));
    expect(hash).toBe(hashAgentKey(key));
  });

  it("detects common PII patterns", () => {
    expect(containsPII("email me at user@example.com")).toBe(true);
    expect(containsPII("card 4111 1111 1111 1111")).toBe(true);
    expect(containsPII("no pii here")).toBe(false);
  });

  it("sanitizes email, ssn, and phone numbers", () => {
    const input = "user@example.com 123-45-6789 +1 (212) 555-1212";
    const sanitized = sanitizePII(input);
    expect(sanitized).toContain("[EMAIL REDACTED]");
    expect(sanitized).toContain("[SSN REDACTED]");
    expect(sanitized).toContain("[PHONE REDACTED]");
    expect(sanitized).not.toContain("user@example.com");
    expect(sanitized).not.toContain("123-45-6789");
    expect(sanitized).not.toContain("555-1212");
  });
});

