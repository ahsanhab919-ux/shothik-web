import { describe, expect, it } from "vitest";

import { buildCredentialAudit, parseEnvContent } from "../scripts/lib/credential-audit.mjs";
import { buildVercelEnvAudit } from "../scripts/lib/vercel-env-audit.mjs";
import {
  buildVercelParityReport,
  formatVercelParityReport,
} from "../scripts/lib/vercel-parity-report.mjs";

describe("vercel parity report", () => {
  it("flags local gaps for keys configured on Vercel", () => {
    const localEnvEntries = parseEnvContent(`
NEXT_PUBLIC_INSFORGE_URL=https://ers8j28a.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=anon_local
OPENAI_API_KEY=sk-local-openai
`);
    const vercelEnvEntries = parseEnvContent(`
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shothik
NEXT_PUBLIC_INSFORGE_URL=https://ers8j28a.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=anon_live
OPENAI_API_KEY=sk-live-openai
STRIPE_SECRET_KEY=sk_live_stripe
`);

    const localAudit = buildCredentialAudit({
      fileEnv: localEnvEntries,
      processEnv: {} as NodeJS.ProcessEnv,
    });
    const vercelAudit = buildVercelEnvAudit({
      environment: "production",
      envEntries: vercelEnvEntries,
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
    });

    const report = buildVercelParityReport({
      localEnvEntries,
      vercelAudit,
      vercelEnvEntries,
      localAudit,
    });

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Local parity gap: DATABASE_URL"),
        expect.stringContaining("Local parity gap: STRIPE_SECRET_KEY"),
      ]),
    );
    expect(report.sections[0]?.missing_on_local).toContain("DATABASE_URL");
    expect(report.sections[2]?.missing_on_local).toContain("STRIPE_SECRET_KEY");
  });

  it("formats a remediation-oriented markdown report", () => {
    const localAudit = buildCredentialAudit({
      fileEnv: new Map(),
      processEnv: {} as NodeJS.ProcessEnv,
    });
    const vercelAudit = buildVercelEnvAudit({
      environment: "production",
      envEntries: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENAI_API_KEY", "sk-live-openai"],
      ]),
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
    });

    const report = buildVercelParityReport({
      localEnvEntries: new Map(),
      vercelAudit,
      vercelEnvEntries: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENAI_API_KEY", "sk-live-openai"],
      ]),
      localAudit,
    });

    const output = formatVercelParityReport(report);
    expect(output).toContain("# Vercel Parity Audit - production");
    expect(output).toContain("## Parity Findings");
    expect(output).toContain("## Remediation");
  });

  it("treats listed Vercel keys as configured when pull output is redacted", () => {
    const localEnvEntries = parseEnvContent(`
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shothik
NEXT_PUBLIC_INSFORGE_URL=https://ers8j28a.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=anon_local
OPENROUTER_API_KEY=sk-local-openrouter
STRIPE_SECRET_KEY=sk_test_local
`);
    const vercelEnvEntries = parseEnvContent(`
DATABASE_URL=
NEXT_PUBLIC_INSFORGE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
OPENROUTER_API_KEY=
STRIPE_SECRET_KEY=
`);
    const vercelListedKeys = new Set([
      "DATABASE_URL",
      "NEXT_PUBLIC_INSFORGE_URL",
      "NEXT_PUBLIC_INSFORGE_ANON_KEY",
      "OPENROUTER_API_KEY",
      "STRIPE_SECRET_KEY",
    ]);

    const localAudit = buildCredentialAudit({
      fileEnv: localEnvEntries,
      processEnv: {} as NodeJS.ProcessEnv,
    });
    const vercelAudit = buildVercelEnvAudit({
      environment: "production",
      envEntries: vercelEnvEntries,
      listedKeys: vercelListedKeys,
      expectedInsforgeUrl: "https://ers8j28a.ap-southeast.insforge.app",
    });

    const report = buildVercelParityReport({
      localEnvEntries,
      vercelAudit,
      vercelEnvEntries,
      vercelListedKeys,
      localAudit,
    });

    expect(report.blockers).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Vercel production: DATABASE_URL is missing."),
        expect.stringContaining("Vercel production: NEXT_PUBLIC_INSFORGE_URL is missing."),
      ]),
    );
    expect(report.sections[0]?.missing_on_vercel).toEqual([]);
  });
});
