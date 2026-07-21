import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCreativeStudioPackageManifest,
  buildCreativeStudioSunpeakInspectorFixture,
  type ShothikMcpPackageManifest,
  type ShothikSunpeakInspectorFixture,
  listCreativeStudioPackageFixtures,
} from "../mcp/package-scaffold";
import { validateCreativeStudioPackageArtifacts } from "../mcp/package-validation";

describe("Creative Studio package validation", () => {
  it("accepts the checked-in manifest and fixture files", () => {
    const manifestPath = path.join(
      process.cwd(),
      "mcp-packages/creative-studio/manifest.json",
    );
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as ShothikMcpPackageManifest;
    const fixtures = listCreativeStudioPackageFixtures().map(({ path: fixturePath }) => ({
      path: fixturePath,
      fixture: JSON.parse(
        readFileSync(path.join(process.cwd(), fixturePath), "utf8"),
      ) as ShothikSunpeakInspectorFixture,
    }));

    const result = validateCreativeStudioPackageArtifacts(
      manifest,
      fixtures,
    );

    expect(result).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects missing host-target readiness coverage", () => {
    const manifest = buildCreativeStudioPackageManifest();
    const fixtures = listCreativeStudioPackageFixtures().filter(
      (entry) =>
        entry.fixture.fixtureType !== "host_readiness" ||
        entry.fixture.hostTarget !== "claude",
    );

    const result = validateCreativeStudioPackageArtifacts(manifest, fixtures);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Missing host readiness fixture for claude.",
    );
  });

  it("rejects incomplete workflow coverage", () => {
    const manifest = buildCreativeStudioPackageManifest();
    const fixtures = [
      {
        path: "mcp-packages/creative-studio/fixtures/creative-studio-smoke.json",
        fixture: {
          ...buildCreativeStudioSunpeakInspectorFixture(),
          scenarios: [],
        },
      },
    ];

    const result = validateCreativeStudioPackageArtifacts(manifest, fixtures);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Workflow fixture creative-studio-smoke must include scenarios.",
    );
    expect(result.errors).toContain(
      "Package fixtures must include at least one confirmed execution scenario.",
    );
  });

  it("accepts confirmation-gate coverage when the fixture omits optional booleans", () => {
    const manifest = buildCreativeStudioPackageManifest();
    const smokeFixture = buildCreativeStudioSunpeakInspectorFixture();
    const fixtures = [
      {
        path: "mcp-packages/creative-studio/fixtures/creative-studio-smoke.json",
        fixture: {
          ...smokeFixture,
          scenarios: smokeFixture.scenarios.map((scenario) =>
            scenario.id === "creative-studio-confirmation-gate"
              ? {
                  ...scenario,
                  request: {
                    ...scenario.request,
                    body: {
                      prompt: "Create a teaser video with dramatic lighting.",
                      assetType: "video",
                    },
                  },
                }
              : scenario,
          ),
        },
      },
      ...listCreativeStudioPackageFixtures().filter(
        (entry) => entry.fixture.fixtureId !== "creative-studio-smoke",
      ),
    ];

    const result = validateCreativeStudioPackageArtifacts(manifest, fixtures);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
