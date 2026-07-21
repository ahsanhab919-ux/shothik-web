import { describe, expect, it } from "vitest";

import {
  buildCredentialAudit,
  classifyValue,
  parseEnvContent,
} from "../scripts/lib/credential-audit.mjs";

const emptyProcessEnv = {} as NodeJS.ProcessEnv;

describe("credential audit", () => {
  it("parses env content and ignores comments", () => {
    const parsed = parseEnvContent(`
# comment
NEXT_PUBLIC_INSFORGE_URL=https://example.insforge.app
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/shothik

INVALID LINE
`);

    expect(parsed.get("NEXT_PUBLIC_INSFORGE_URL")).toBe("https://example.insforge.app");
    expect(parsed.get("DATABASE_URL")).toBe("postgres://postgres:postgres@localhost:5432/shothik");
    expect(parsed.has("INVALID LINE")).toBe(false);
  });

  it("classifies placeholder-like values separately from configured credentials", () => {
    expect(classifyValue("")).toBe("missing");
    expect(classifyValue("pk_test_placeholder")).toBe("placeholder");
    expect(classifyValue("https://example.insforge.app")).toBe("placeholder");
    expect(classifyValue("postgres://postgres:postgres@localhost:5432/shothik")).toBe("configured");
    expect(classifyValue("sk_test_realistic")).toBe("configured");
  });

  it("marks InsForge placeholders as blocking gaps", () => {
    const audit = buildCredentialAudit({
      fileEnv: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://example.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_test_placeholder"],
      ]),
      processEnv: emptyProcessEnv,
    });

    const coreSection = audit.summary.find((section) => section.category === "Core platform");
    expect(coreSection?.status).toBe("blocking");
    expect(audit.blockingGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "NEXT_PUBLIC_INSFORGE_URL" }),
        expect.objectContaining({ key: "NEXT_PUBLIC_INSFORGE_ANON_KEY" }),
      ]),
    );
  });

  it("accepts any configured AI provider in the required one-of group", () => {
    const audit = buildCredentialAudit({
      fileEnv: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["OPENROUTER_API_KEY", "openrouter_live_key"],
      ]),
      processEnv: emptyProcessEnv,
    });

    const aiSection = audit.summary.find((section) => section.category === "AI providers");
    expect(aiSection?.oneOfSatisfied).toBe(true);
    expect(aiSection?.status).toBe("partial");
    expect(audit.blockingGaps.some((gap) => gap.category === "AI providers")).toBe(false);
  });

  it("flags configured Convex credentials as migration warnings", () => {
    const audit = buildCredentialAudit({
      fileEnv: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["KIMI_API_KEY", "kimi_live_key"],
        ["NEXT_PUBLIC_CONVEX_URL", "https://deployment.convex.cloud"],
      ]),
      processEnv: emptyProcessEnv,
    });

    expect(audit.migrationWarnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "NEXT_PUBLIC_CONVEX_URL" }),
      ]),
    );
  });

  it("includes Google Books and Drive publishing credentials as feature-dependent entries", () => {
    const audit = buildCredentialAudit({
      fileEnv: new Map([
        ["DATABASE_URL", "postgres://postgres:postgres@localhost:5432/shothik"],
        ["NEXT_PUBLIC_INSFORGE_URL", "https://ers8j28a.ap-southeast.insforge.app"],
        ["NEXT_PUBLIC_INSFORGE_ANON_KEY", "anon_live_key"],
        ["KIMI_API_KEY", "kimi_live_key"],
        ["NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY", "AIzaRestrictedBooksKey"],
      ]),
      processEnv: emptyProcessEnv,
    });

    const publishingSection = audit.summary.find(
      (section) => section.category === "Publishing and content distribution",
    );

    expect(publishingSection?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY", status: "configured" }),
        expect.objectContaining({ key: "GOOGLE_DRIVE_CLIENT_ID" }),
        expect.objectContaining({ key: "GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY" }),
      ]),
    );
  });
});
