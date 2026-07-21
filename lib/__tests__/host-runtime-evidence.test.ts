import { describe, expect, it } from "vitest";

import { collectCreativeStudioHostRuntimeEvidence } from "../mcp/host-runtime-evidence";

describe("collectCreativeStudioHostRuntimeEvidence", () => {
  it("collects captured evidence for validation", () => {
    const result = collectCreativeStudioHostRuntimeEvidence([
      {
        schemaVersion: "1.0",
        packageId: "shothik-creative-studio",
        hostTarget: "chatgpt",
        collectionStatus: "captured",
        collectionMethod: "host_runtime",
        observedAt: "2026-07-18T00:06:50Z",
        observedUrl: "https://chatgpt.com/g/example",
        observedTitle: "Creative Studio",
        evidence: {
          hostTarget: "chatgpt",
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
          ],
        },
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(result.evidence).toHaveLength(1);
  });

  it("surfaces pending host blockers without fabricating runtime evidence", () => {
    const result = collectCreativeStudioHostRuntimeEvidence([
      {
        schemaVersion: "1.0",
        packageId: "shothik-creative-studio",
        hostTarget: "claude",
        collectionStatus: "pending_authentication",
        collectionMethod: "manual_browser",
        observedAt: "2026-07-18T00:06:50Z",
        observedUrl: "https://claude.ai/login",
        observedTitle: "Sign in - Claude",
        blocker: {
          code: "host_auth_required",
          message:
            "Sign in to Claude in the current browser context before runtime scenario collection can begin.",
        },
        notes: ["Host reachable but redirected to login."],
        evidence: null,
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.evidence).toEqual([]);
    expect(result.blockers).toEqual([
      "claude: Sign in to Claude in the current browser context before runtime scenario collection can begin.",
    ]);
  });

  it("reports a structural error when captured evidence omits the runtime payload", () => {
    const result = collectCreativeStudioHostRuntimeEvidence([
      {
        schemaVersion: "1.0",
        packageId: "shothik-creative-studio",
        hostTarget: "chatgpt",
        collectionStatus: "captured",
        collectionMethod: "hybrid",
        observedAt: "2026-07-18T03:15:00Z",
        observedUrl: "https://chatgpt.com/",
        observedTitle: "ChatGPT",
        notes: ["Authenticated host shell observed."],
        evidence: null,
      },
    ]);

    expect(result.evidence).toEqual([]);
    expect(result.blockers).toEqual([]);
    expect(result.errors).toEqual([
      "Captured evidence file for chatgpt must include evidence payload.",
    ]);
  });
});
