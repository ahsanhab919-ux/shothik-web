import { HIGGSFIELD_CONNECTOR_SLUG } from "./connectors/higgsfield";
import { SHOTHIK_NATIVE_CONNECTOR_SLUG } from "./connectors/shothik-native";
import {
  SHOTHIK_NATIVE_TOOL_DEFINITIONS,
  type ShothikNativeMcpToolName,
} from "./native-tools";

export type MCPPackageHostTarget = "chatgpt" | "claude";

export interface ShothikMcpPackageManifest {
  schemaVersion: "1.0";
  packageId: "shothik-creative-studio";
  version: "0.1.0";
  displayName: string;
  description: string;
  reviewStatus: "scaffold";
  packageReady: boolean;
  workflowSurface: {
    uiPath: "/creative-studio";
    apiPath: "/api/mcp/creative-studio";
    authRequired: true;
    confirmationFlow: "explicit_mutation_confirmation";
    planner: "openrouter";
  };
  connectorCatalog: {
    remoteConnectorSlug: typeof HIGGSFIELD_CONNECTOR_SLUG;
    remoteTools: readonly ["generate_image", "generate_video"];
    nativeConnectorSlug: typeof SHOTHIK_NATIVE_CONNECTOR_SLUG;
    availableNativeTools: ShothikNativeMcpToolName[];
    defaultSupportTools: ShothikNativeMcpToolName[];
  };
  distribution: {
    hostTargets: MCPPackageHostTarget[];
    packagingTool: "sunpeak";
    inspectorFixturePaths: string[];
  };
  security: {
    requiredEnvironment: ("HIGGSFIELD_MCP_URL" | "HIGGSFIELD_MCP_API_KEY")[];
    confirmationRequiredForRemoteWrites: true;
    nativeToolsReadOnly: true;
    noClientSecrets: true;
  };
}

interface BaseShothikSunpeakFixture {
  schemaVersion: "1.0";
  fixtureId: string;
  packageId: "shothik-creative-studio";
  title: string;
  purpose: string;
  fixtureType: "workflow" | "host_readiness";
  uiPath: "/creative-studio";
  apiPath: "/api/mcp/creative-studio";
  expectedRemoteConnectorSlug: typeof HIGGSFIELD_CONNECTOR_SLUG;
  requiredNativeTools: ShothikNativeMcpToolName[];
}

export interface ShothikSunpeakWorkflowFixture
  extends BaseShothikSunpeakFixture {
  fixtureType: "workflow";
  scenarios: Array<{
    id: string;
    title: string;
    request: {
      method: "POST";
      path: "/api/mcp/creative-studio";
      body: Record<string, unknown>;
    };
    expect: {
      statusCode: 200 | 409;
      responseShape: string[];
    };
  }>;
}

export interface ShothikSunpeakHostReadinessFixture
  extends BaseShothikSunpeakFixture {
  fixtureType: "host_readiness";
  hostTarget: MCPPackageHostTarget;
  assertions: Array<{
    id: string;
    description: string;
    severity: "required" | "recommended";
  }>;
}

export type ShothikSunpeakInspectorFixture =
  | ShothikSunpeakWorkflowFixture
  | ShothikSunpeakHostReadinessFixture;

const DEFAULT_SUPPORT_TOOLS: ShothikNativeMcpToolName[] = [
  "shothik.paraphrase.rewrite_text",
  "shothik.summarize.summarize_text",
  "shothik.translator.translate_text",
  "shothik.humanize.rewrite_humanized_text",
];

const PACKAGE_FIXTURE_PATHS = [
  "mcp-packages/creative-studio/fixtures/creative-studio-smoke.json",
  "mcp-packages/creative-studio/fixtures/creative-studio-confirmed-run.json",
  "mcp-packages/creative-studio/fixtures/creative-studio-chatgpt-readiness.json",
  "mcp-packages/creative-studio/fixtures/creative-studio-claude-readiness.json",
] as const;

export function buildCreativeStudioPackageManifest(): ShothikMcpPackageManifest {
  return {
    schemaVersion: "1.0",
    packageId: "shothik-creative-studio",
    version: "0.1.0",
    displayName: "Shothik Creative Studio",
    description:
      "MCP app packaging scaffold for planning and executing creative image and video workflows through Shothik using Higgsfield plus selected native support tools.",
    reviewStatus: "scaffold",
    packageReady: false,
    workflowSurface: {
      uiPath: "/creative-studio",
      apiPath: "/api/mcp/creative-studio",
      authRequired: true,
      confirmationFlow: "explicit_mutation_confirmation",
      planner: "openrouter",
    },
    connectorCatalog: {
      remoteConnectorSlug: HIGGSFIELD_CONNECTOR_SLUG,
      remoteTools: ["generate_image", "generate_video"],
      nativeConnectorSlug: SHOTHIK_NATIVE_CONNECTOR_SLUG,
      availableNativeTools: SHOTHIK_NATIVE_TOOL_DEFINITIONS.map(
        (tool) => tool.name,
      ),
      defaultSupportTools: DEFAULT_SUPPORT_TOOLS,
    },
    distribution: {
      hostTargets: ["chatgpt", "claude"],
      packagingTool: "sunpeak",
      inspectorFixturePaths: [...PACKAGE_FIXTURE_PATHS],
    },
    security: {
      requiredEnvironment: ["HIGGSFIELD_MCP_URL", "HIGGSFIELD_MCP_API_KEY"],
      confirmationRequiredForRemoteWrites: true,
      nativeToolsReadOnly: true,
      noClientSecrets: true,
    },
  };
}

export function buildCreativeStudioSunpeakInspectorFixture(): ShothikSunpeakWorkflowFixture {
  return {
    schemaVersion: "1.0",
    fixtureId: "creative-studio-smoke",
    packageId: "shothik-creative-studio",
    title: "Creative Studio Smoke",
    purpose:
      "Validate the packaged Creative Studio boundary before host-runtime testing by exercising dry-run planning and confirmation-required live execution.",
    fixtureType: "workflow",
    uiPath: "/creative-studio",
    apiPath: "/api/mcp/creative-studio",
    expectedRemoteConnectorSlug: HIGGSFIELD_CONNECTOR_SLUG,
    requiredNativeTools: DEFAULT_SUPPORT_TOOLS,
    scenarios: [
      {
        id: "creative-studio-dry-run-plan",
        title: "Dry-run plan returns connector and tool selection",
        request: {
          method: "POST",
          path: "/api/mcp/creative-studio",
          body: {
            prompt: "Create a cinematic hero visual for a product launch.",
            assetType: "image",
            style: "editorial",
            dryRun: true,
            confirmed: false,
          },
        },
        expect: {
          statusCode: 200,
          responseShape: [
            "success",
            "connectorId",
            "toolName",
            "output.planned",
            "output.arguments.prompt",
          ],
        },
      },
      {
        id: "creative-studio-confirmation-gate",
        title: "Live generation surfaces confirmation before remote mutation",
        request: {
          method: "POST",
          path: "/api/mcp/creative-studio",
          body: {
            prompt: "Create a teaser video with dramatic lighting.",
            assetType: "video",
            dryRun: false,
            confirmed: false,
          },
        },
        expect: {
          statusCode: 409,
          responseShape: [
            "error",
            "message",
            "connectorId",
            "toolName",
            "policyReasonCode",
          ],
        },
      },
    ],
  };
}

export function buildCreativeStudioConfirmedRunFixture(): ShothikSunpeakWorkflowFixture {
  return {
    schemaVersion: "1.0",
    fixtureId: "creative-studio-confirmed-run",
    packageId: "shothik-creative-studio",
    title: "Creative Studio Confirmed Run",
    purpose:
      "Validate the response contract for a confirmed creative execution after the explicit mutation gate is satisfied.",
    fixtureType: "workflow",
    uiPath: "/creative-studio",
    apiPath: "/api/mcp/creative-studio",
    expectedRemoteConnectorSlug: HIGGSFIELD_CONNECTOR_SLUG,
    requiredNativeTools: DEFAULT_SUPPORT_TOOLS,
    scenarios: [
      {
        id: "creative-studio-confirmed-image-run",
        title: "Confirmed generation returns invocation metadata and output payload",
        request: {
          method: "POST",
          path: "/api/mcp/creative-studio",
          body: {
            prompt: "Create a refined campaign image with cinematic contrast.",
            assetType: "image",
            style: "premium editorial",
            dryRun: false,
            confirmed: true,
          },
        },
        expect: {
          statusCode: 200,
          responseShape: [
            "success",
            "connectorId",
            "toolName",
            "invocationId",
            "output",
          ],
        },
      },
    ],
  };
}

function buildHostAssertions(
  hostTarget: MCPPackageHostTarget,
): ShothikSunpeakHostReadinessFixture["assertions"] {
  return [
    {
      id: `${hostTarget}-auth-required`,
      description:
        "The package surface must keep authenticated access enforced before workflow execution begins.",
      severity: "required",
    },
    {
      id: `${hostTarget}-confirmation-gate`,
      description:
        "The host package must preserve explicit confirmation for remote creative mutations.",
      severity: "required",
    },
    {
      id: `${hostTarget}-no-client-secrets`,
      description:
        "The host package must not expose connector secrets or raw MCP credentials in client-accessible state.",
      severity: "required",
    },
    {
      id: `${hostTarget}-native-tool-catalog`,
      description:
        "The host package should expose the approved native support-tool catalog for helper workflows and future inspectors.",
      severity: "recommended",
    },
  ];
}

function buildCreativeStudioHostReadinessFixture(
  hostTarget: MCPPackageHostTarget,
): ShothikSunpeakHostReadinessFixture {
  const label = hostTarget === "chatgpt" ? "ChatGPT" : "Claude";

  return {
    schemaVersion: "1.0",
    fixtureId: `creative-studio-${hostTarget}-readiness`,
    packageId: "shothik-creative-studio",
    title: `Creative Studio ${label} Readiness`,
    purpose:
      `Review host-target readiness assertions for ${label} before live package generation or host-runtime automation begins.`,
    fixtureType: "host_readiness",
    uiPath: "/creative-studio",
    apiPath: "/api/mcp/creative-studio",
    expectedRemoteConnectorSlug: HIGGSFIELD_CONNECTOR_SLUG,
    requiredNativeTools: DEFAULT_SUPPORT_TOOLS,
    hostTarget,
    assertions: buildHostAssertions(hostTarget),
  };
}

export function buildCreativeStudioChatgptReadinessFixture(): ShothikSunpeakHostReadinessFixture {
  return buildCreativeStudioHostReadinessFixture("chatgpt");
}

export function buildCreativeStudioClaudeReadinessFixture(): ShothikSunpeakHostReadinessFixture {
  return buildCreativeStudioHostReadinessFixture("claude");
}

export function listCreativeStudioPackageFixtures(): Array<{
  path: (typeof PACKAGE_FIXTURE_PATHS)[number];
  fixture: ShothikSunpeakInspectorFixture;
}> {
  return [
    {
      path: PACKAGE_FIXTURE_PATHS[0],
      fixture: buildCreativeStudioSunpeakInspectorFixture(),
    },
    {
      path: PACKAGE_FIXTURE_PATHS[1],
      fixture: buildCreativeStudioConfirmedRunFixture(),
    },
    {
      path: PACKAGE_FIXTURE_PATHS[2],
      fixture: buildCreativeStudioChatgptReadinessFixture(),
    },
    {
      path: PACKAGE_FIXTURE_PATHS[3],
      fixture: buildCreativeStudioClaudeReadinessFixture(),
    },
  ];
}
