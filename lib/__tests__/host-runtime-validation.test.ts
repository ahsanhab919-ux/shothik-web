import { describe, expect, it } from "vitest";

import { validateCreativeStudioHostRuntime } from "../mcp/host-runtime-validation";
import {
  buildCreativeStudioPackageManifest,
  listCreativeStudioPackageFixtures,
} from "../mcp/package-scaffold";

describe("validateCreativeStudioHostRuntime", () => {
  it("accepts complete host-runtime evidence for all declared hosts", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [
        buildPassingEvidence("chatgpt"),
        buildPassingEvidence("claude"),
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.hosts.every((host) => host.ok)).toBe(true);
  });

  it("rejects missing host evidence", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [buildPassingEvidence("chatgpt")],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Missing host-runtime evidence for claude.");
  });

  it("rejects runtime observations that break the confirmation gate", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [
        buildPassingEvidence("chatgpt"),
        {
          ...buildPassingEvidence("claude"),
          explicitConfirmationForRemoteWrites: false,
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "claude: Remote writes bypass the explicit confirmation gate.",
    );
  });

  it("rejects duplicate host evidence entries", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [
        buildPassingEvidence("chatgpt"),
        buildPassingEvidence("chatgpt"),
        buildPassingEvidence("claude"),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Duplicate host-runtime evidence for chatgpt.");
  });

  it("rejects scenario response-shape mismatches", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [
        {
          ...buildPassingEvidence("chatgpt"),
          scenarioObservations: buildPassingEvidence("chatgpt").scenarioObservations.map(
            (scenario) =>
              scenario.scenarioId === "creative-studio-confirmation-gate"
                ? {
                    ...scenario,
                    observedResponseShape: ["error", "message"],
                  }
                : scenario,
          ),
        },
        buildPassingEvidence("claude"),
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "chatgpt: Scenario creative-studio-confirmation-gate is missing response keys connectorId, toolName, policyReasonCode.",
    );
  });

  it("keeps recommended assertion drift inspectable without failing the full validation result", () => {
    const fixtures = listCreativeStudioPackageFixtures().map((entry) => entry.fixture);
    const result = validateCreativeStudioHostRuntime({
      manifest: buildCreativeStudioPackageManifest(),
      fixtures,
      evidence: [
        buildPassingEvidence("chatgpt"),
        {
          ...buildPassingEvidence("claude"),
          nativeToolCatalogAvailable: false,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);

    const claudeHost = result.hosts.find((host) => host.hostTarget === "claude");
    const nativeCatalogAssertion = claudeHost?.assertionResults.find(
      (assertion) => assertion.assertionId === "claude-native-tool-catalog",
    );

    expect(claudeHost?.ok).toBe(true);
    expect(nativeCatalogAssertion).toMatchObject({
      severity: "recommended",
      ok: false,
    });
    expect(nativeCatalogAssertion?.message).toContain(
      "Approved native support tools are not available to the host package.",
    );
  });
});

function buildPassingEvidence(hostTarget: "chatgpt" | "claude") {
  return {
    hostTarget,
    authenticatedAccessEnforced: true,
    explicitConfirmationForRemoteWrites: true,
    exposesClientSecrets: false,
    nativeToolCatalogAvailable: true,
    scenarioObservations: [
      {
        scenarioId: "creative-studio-dry-run-plan",
        observedStatusCode: 200,
        observedResponseShape: [
          "success",
          "connectorId",
          "toolName",
          "output.planned",
          "output.arguments.prompt",
        ],
      },
      {
        scenarioId: "creative-studio-confirmation-gate",
        observedStatusCode: 409,
        observedResponseShape: [
          "error",
          "message",
          "connectorId",
          "toolName",
          "policyReasonCode",
        ],
      },
      {
        scenarioId: "creative-studio-confirmed-image-run",
        observedStatusCode: 200,
        observedResponseShape: [
          "success",
          "connectorId",
          "toolName",
          "invocationId",
          "output",
        ],
      },
    ],
  };
}
