import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreativeStudioPackageManifest,
  buildCreativeStudioChatgptReadinessFixture,
  buildCreativeStudioClaudeReadinessFixture,
  buildCreativeStudioConfirmedRunFixture,
  buildCreativeStudioSunpeakInspectorFixture,
  listCreativeStudioPackageFixtures,
} from "../mcp/package-scaffold";

describe("Creative Studio package scaffold", () => {
  it("matches the checked-in package manifest", () => {
    const manifestPath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/manifest.json",
    );
    const checkedInManifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as unknown;

    expect(checkedInManifest).toEqual(buildCreativeStudioPackageManifest());
  });

  it("matches the checked-in inspector fixture", () => {
    const fixturePath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/fixtures/creative-studio-smoke.json",
    );
    const checkedInFixture = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as unknown;

    expect(checkedInFixture).toEqual(
      buildCreativeStudioSunpeakInspectorFixture(),
    );
  });

  it("matches the checked-in confirmed-run fixture", () => {
    const fixturePath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/fixtures/creative-studio-confirmed-run.json",
    );
    const checkedInFixture = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as unknown;

    expect(checkedInFixture).toEqual(buildCreativeStudioConfirmedRunFixture());
  });

  it("matches the checked-in ChatGPT host-readiness fixture", () => {
    const fixturePath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/fixtures/creative-studio-chatgpt-readiness.json",
    );
    const checkedInFixture = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as unknown;

    expect(checkedInFixture).toEqual(
      buildCreativeStudioChatgptReadinessFixture(),
    );
  });

  it("matches the checked-in Claude host-readiness fixture", () => {
    const fixturePath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/fixtures/creative-studio-claude-readiness.json",
    );
    const checkedInFixture = JSON.parse(
      readFileSync(fixturePath, "utf8"),
    ) as unknown;

    expect(checkedInFixture).toEqual(buildCreativeStudioClaudeReadinessFixture());
  });

  it("keeps fixture tool references inside the package manifest catalog", () => {
    const manifest = buildCreativeStudioPackageManifest();
    const fixture = buildCreativeStudioSunpeakInspectorFixture();

    expect(
      fixture.requiredNativeTools.every((toolName) =>
        manifest.connectorCatalog.availableNativeTools.includes(toolName),
      ),
    ).toBe(true);
    expect(manifest.distribution.inspectorFixturePaths).toContain(
      "mcp-packages/creative-studio/fixtures/creative-studio-smoke.json",
    );
  });

  it("keeps the fixture file list aligned with the manifest fixture paths", () => {
    const manifest = buildCreativeStudioPackageManifest();
    const fixtures = listCreativeStudioPackageFixtures();

    expect(fixtures.map((entry) => entry.path)).toEqual(
      manifest.distribution.inspectorFixturePaths,
    );
  });
});
