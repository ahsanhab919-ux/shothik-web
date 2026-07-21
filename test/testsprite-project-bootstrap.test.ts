import { describe, expect, it } from "vitest";

import {
  buildProjectMetadata,
  buildProjectMutationPlan,
  formatLoopbackProjectTargetError,
  formatProtectedProjectTargetError,
  formatProjectTargetValidationError,
  isAcceptedProjectTargetStatus,
  isLoopbackProjectTarget,
  isProtectedProjectTarget,
  normalizeProjectRecord,
  parseBootstrapArgs,
  resolveProjectBootstrapConfig,
  selectManagedProject,
} from "../scripts/lib/testsprite-project-bootstrap.mjs";

describe("testsprite project bootstrap", () => {
  it("parses bootstrap CLI flags", () => {
    const args = parseBootstrapArgs([
      "--name",
      "shothik-web",
      "--url",
      "https://example.com",
      "--type",
      "frontend",
      "--instruction",
      "Run preview smoke",
      "--json",
      "--dry-run",
    ]);

    expect(args).toEqual({
      name: "shothik-web",
      url: "https://example.com",
      type: "frontend",
      instruction: "Run preview smoke",
      json: true,
      dryRun: true,
    });
  });

  it("keeps defaults when optional CLI flags are omitted", () => {
    expect(parseBootstrapArgs(["--name"])).toEqual({
      name: null,
      url: null,
      type: "frontend",
      instruction: null,
      json: false,
      dryRun: false,
    });
  });

  it("resolves configuration from CLI, env, and local env fallbacks", () => {
    const config = resolveProjectBootstrapConfig({
      cliArgs: parseBootstrapArgs([]),
      processEnv: {
        TESTSPRITE_PROJECT_NAME: "shothik-web-env",
        TESTSPRITE_PROJECT_INSTRUCTION: "Use preview URL",
      },
      localEnv: new Map([
        ["PLAYWRIGHT_BASE_URL", "https://preview.example.com"],
      ]),
      packageName: "shothik-web",
    });

    expect(config).toEqual({
      projectName: "shothik-web-env",
      targetUrl: "https://preview.example.com",
      type: "frontend",
      instruction: "Use preview URL",
      json: false,
      dryRun: false,
    });
  });

  it("lets explicit CLI values override env fallbacks and uses package defaults", () => {
    const config = resolveProjectBootstrapConfig({
      cliArgs: parseBootstrapArgs([
        "--name",
        "shothik-web-cli",
        "--url",
        "https://cli.example.com",
        "--type",
        "frontend",
      ]),
      processEnv: {
        TESTSPRITE_PROJECT_NAME: "shothik-web-env",
        TESTSPRITE_PROJECT_URL: "https://env.example.com",
      },
      localEnv: new Map([["NEXT_PUBLIC_APP_URL", "https://local.example.com"]]),
      packageName: "shothik-web",
    });

    expect(config.projectName).toBe("shothik-web-cli");
    expect(config.targetUrl).toBe("https://cli.example.com");
    expect(config.type).toBe("frontend");
  });

  it("selects a managed project by cached id, url, or name", () => {
    const items = [
      { id: "project-1", name: "other", targetUrl: "https://other.example.com" },
      { id: "project-2", name: "shothik-web", targetUrl: "https://preview.example.com" },
    ];

    expect(
      selectManagedProject({
        projectItems: items,
        cachedProject: { id: "project-2" },
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
      }),
    ).toEqual(items[1]);

    expect(
      selectManagedProject({
        projectItems: items,
        cachedProject: null,
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
      }),
    ).toEqual(items[1]);

    expect(
      selectManagedProject({
        projectItems: items,
        cachedProject: null,
        projectName: "other",
        targetUrl: "https://missing.example.com",
      }),
    ).toEqual(items[0]);

    expect(
      selectManagedProject({
        projectItems: [],
        cachedProject: null,
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
      }),
    ).toBeNull();
  });

  it("builds create, update, and noop mutation plans", () => {
    expect(
      buildProjectMutationPlan({
        existingProject: null,
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
        instruction: "Run preview smoke",
      }),
    ).toEqual(
      expect.objectContaining({
        action: "create",
        args: expect.arrayContaining(["--instruction", "Run preview smoke"]),
      }),
    );

    expect(
      buildProjectMutationPlan({
        existingProject: {
          id: "project-1",
          name: "shothik-web",
          targetUrl: "https://old.example.com",
        },
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
        instruction: "Run preview smoke",
      }),
    ).toEqual(
      expect.objectContaining({
        action: "update",
        args: expect.arrayContaining(["--instruction", "Run preview smoke"]),
      }),
    );

    expect(
      buildProjectMutationPlan({
        existingProject: {
          id: "project-1",
          name: "shothik-web",
          targetUrl: "https://preview.example.com",
        },
        projectName: "shothik-web",
        targetUrl: "https://preview.example.com",
      }),
    ).toEqual(
      expect.objectContaining({
        action: "noop",
      }),
    );
  });

  it("classifies accepted and rejected project target status codes", () => {
    expect(isAcceptedProjectTargetStatus(200)).toBe(true);
    expect(isAcceptedProjectTargetStatus(403)).toBe(true);
    expect(isAcceptedProjectTargetStatus(402)).toBe(false);
    expect(formatProjectTargetValidationError("https://preview.example.com", 402)).toContain(
      "HTTP 402",
    );
    expect(isLoopbackProjectTarget("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackProjectTarget("http://localhost:3000")).toBe(true);
    expect(isLoopbackProjectTarget("https://preview.example.com")).toBe(false);
    expect(formatLoopbackProjectTargetError("http://127.0.0.1:3000")).toContain(
      "do not accept loopback targets",
    );
  });

  it("detects Vercel SSO-protected targets and formats a clear error", () => {
    expect(
      isProtectedProjectTarget({
        effectiveUrl:
          "https://vercel.com/sso-api?url=https%3A%2F%2Fpreview.example.com",
      }),
    ).toBe(true);
    expect(
      isProtectedProjectTarget({
        responseHeaders:
          "HTTP/2 302\nlocation: https://vercel.com/sso-api?url=https%3A%2F%2Fpreview.example.com\n",
      }),
    ).toBe(true);
    expect(
      isProtectedProjectTarget({
        responseHeaders: "HTTP/2 200\ncontent-type: text/html\n",
        effectiveUrl: "https://staging.example.com",
      }),
    ).toBe(false);
    expect(
      formatProtectedProjectTargetError(
        "https://preview.example.com",
        "https://vercel.com/sso-api?url=https%3A%2F%2Fpreview.example.com",
      ),
    ).toContain("interactive access controls");
  });

  it("throws a clear error when no target url is available", () => {
    expect(() =>
      buildProjectMutationPlan({
        existingProject: null,
        projectName: "shothik-web",
        targetUrl: null,
      }),
    ).toThrow("Missing TestSprite project URL");
  });

  it("builds normalized project metadata records", () => {
    const metadata = buildProjectMetadata({
      project: {
        id: "project-1",
        name: "shothik-web",
        type: "frontend",
        targetUrl: "https://preview.example.com",
        createdFrom: "cli",
        createdAt: "2026-07-16T00:00:00.000Z",
        updatedAt: "2026-07-16T00:05:00.000Z",
      },
      projectName: "shothik-web",
      targetUrl: "https://preview.example.com",
      type: "frontend",
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        id: "project-1",
        name: "shothik-web",
        type: "frontend",
        targetUrl: "https://preview.example.com",
        createdFrom: "cli",
      }),
    );
    expect(metadata.syncedAt).toBeTruthy();
  });

  it("fills metadata defaults when cloud fields are absent", () => {
    const metadata = buildProjectMetadata({
      project: {
        id: "project-2",
      },
      projectName: "shothik-web",
      targetUrl: "https://preview.example.com",
      type: "frontend",
      source: "testsprite-cli",
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        id: "project-2",
        name: "shothik-web",
        type: "frontend",
        targetUrl: "https://preview.example.com",
        createdFrom: "testsprite-cli",
        createdAt: null,
        updatedAt: null,
      }),
    );
  });

  it("normalizes project records returned by the TestSprite CLI", () => {
    expect(
      normalizeProjectRecord({
        projectId: "project-3",
        name: "shothik-web",
        url: "https://staging.example.com",
      }),
    ).toEqual(
      expect.objectContaining({
        id: "project-3",
        name: "shothik-web",
        targetUrl: "https://staging.example.com",
      }),
    );

    const metadata = buildProjectMetadata({
      project: {
        projectId: "project-3",
        name: "shothik-web",
      },
      projectName: "shothik-web",
      targetUrl: "https://staging.example.com",
      type: "frontend",
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        id: "project-3",
        targetUrl: "https://staging.example.com",
      }),
    );
  });
});
