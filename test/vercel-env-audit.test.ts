import { describe, expect, it } from "vitest";

import {
  buildVercelEnvAudit,
  formatVercelEnvAudit,
  isSystemKey,
} from "../scripts/lib/vercel-env-audit.mjs";

describe("vercel env audit", () => {
  it("ignores Vercel-managed system variables when counting user-defined env keys", () => {
    const audit = buildVercelEnvAudit({
      environment: "production",
      envEntries: new Map([
        ["VERCEL", "1"],
        ["VERCEL_ENV", "production"],
        ["TURBO_CACHE", "remote:rw"],
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENAI_API_KEY", "sk-live-openai"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    expect(isSystemKey("VERCEL_ENV")).toBe(true);
    expect(isSystemKey("DATABASE_URL")).toBe(false);
    expect(audit.user_defined_variable_count).toBe(4);
    expect(audit.user_defined_keys).toEqual([
      "DATABASE_URL",
      "NEXT_PUBLIC_INSFORGE_ANON_KEY",
      "NEXT_PUBLIC_INSFORGE_URL",
      "OPENAI_API_KEY",
    ]);
  });

  it("fails when core InsForge keys and AI providers are missing", () => {
    const audit = buildVercelEnvAudit({
      envEntries: new Map([
        ["VERCEL_ENV", "production"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    expect(audit.pass).toBe(false);
    expect(audit.blocking_issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "DATABASE_URL", reason: "missing" }),
        expect.objectContaining({ key: "NEXT_PUBLIC_INSFORGE_URL", reason: "missing" }),
        expect.objectContaining({ key: "NEXT_PUBLIC_INSFORGE_ANON_KEY", reason: "missing" }),
        expect.objectContaining({ key: "AI_PROVIDER", reason: "missing" }),
      ]),
    );
  });

  it("warns when the configured InsForge URL does not match the linked production backend", () => {
    const audit = buildVercelEnvAudit({
      envEntries: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://wrong-host.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["GEMINI_API_KEY", "gemini_live_key"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    expect(audit.pass).toBe(false);
    expect(audit.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("NEXT_PUBLIC_INSFORGE_URL is configured as https://wrong-host.ap-southeast.insforge.app"),
      ]),
    );
  });

  it("passes when required InsForge keys and one AI provider are configured", () => {
    const audit = buildVercelEnvAudit({
      envEntries: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENAI_API_KEY", "sk-live-openai"],
        ["NEXT_PUBLIC_CONVEX_URL", "https://legacy.convex.cloud"],
        ["STRIPE_SECRET_KEY", "sk_live_stripe"],
        ["API_KEY_SALT", "live-salt"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    expect(audit.pass).toBe(true);
    expect(audit.blocking_issues).toHaveLength(0);
    expect(audit.warnings).toHaveLength(0);
  });

  it("treats listed but redacted Vercel variables as configured", () => {
    const audit = buildVercelEnvAudit({
      envEntries: new Map([
        ["DATABASE_URL", ""],
        ["NEXT_PUBLIC_INSFORGE_URL", ""],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", ""],
        ["OPENROUTER_API_KEY", ""],
      ]),
      listedKeys: new Set([
        "DATABASE_URL",
        "NEXT_PUBLIC_INSFORGE_URL",
        "NEXT_PUBLIC_INSFORGE_ANON_KEY",
        "OPENROUTER_API_KEY",
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    expect(audit.pass).toBe(true);
    expect(audit.blocking_issues).toHaveLength(0);
    expect(audit.user_defined_keys).toEqual([
      "DATABASE_URL",
      "NEXT_PUBLIC_INSFORGE_ANON_KEY",
      "NEXT_PUBLIC_INSFORGE_URL",
      "OPENROUTER_API_KEY",
    ]);
  });

  it("formats a readable report with pass/fail status", () => {
    const audit = buildVercelEnvAudit({
      envEntries: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENAI_API_KEY", "sk-live-openai"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
      pulledAt: "2026-07-16T00:00:00.000Z",
    });

    const output = formatVercelEnvAudit(audit);

    expect(output).toContain("Vercel environment audit: production");
    expect(output).toContain("AI provider requirement: configured via OPENAI_API_KEY");
    expect(output).toContain("Result: PASS");
  });
});
