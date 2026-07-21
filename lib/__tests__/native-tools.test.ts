import { describe, expect, it } from "vitest";

import { resolveShothikNativeConnectorId } from "../mcp/connectors/shothik-native";
import {
  SHOTHIK_NATIVE_TOOL_DEFINITIONS,
  getShothikNativeMcpTool,
  getShothikNativeMcpToolDefinition,
  isPublicShothikNativeMcpTool,
  isShothikNativeMcpTool,
  listShothikNativeMcpTools,
} from "../mcp/native-tools";

describe("Shothik native MCP tool registry", () => {
  it("lists all selected native tools against the tenant-scoped native connector", () => {
    const tenantId = "tenant-1";
    const discoveredAt = "2026-07-17T15:00:00.000Z";
    const tools = listShothikNativeMcpTools(tenantId, discoveredAt);

    expect(tools).toHaveLength(SHOTHIK_NATIVE_TOOL_DEFINITIONS.length);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    expect(
      tools.every(
        (tool) =>
          tool.connectorId === resolveShothikNativeConnectorId(tenantId) &&
          tool.discoveredAt === discoveredAt &&
          tool.status === "enabled",
      ),
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === "shothik.twin.execute_task")?.mutationMode,
    ).toBe("write");
    expect(
      tools.find((tool) => tool.name === "shothik.twin.create_forum")?.mutationMode,
    ).toBe("write");
    expect(
      tools.find((tool) => tool.name === "shothik.twin.create_forum_post")?.mutationMode,
    ).toBe("write");
    expect(
      tools.find((tool) => tool.name === "shothik.twin.execute_book_write")?.mutationMode,
    ).toBe("write");
    expect(
      tools.find((tool) => tool.name === "shothik.twin.publish_book")?.mutationMode,
    ).toBe("write");
    expect(
      tools.find((tool) => tool.name === "shothik.twin.post_community_preview")?.mutationMode,
    ).toBe("write");
  });

  it("exposes provider metadata for package-candidate native tools", () => {
    const tool = getShothikNativeMcpTool(
      "tenant-1",
      "shothik.paraphrase.rewrite_text",
      "2026-07-17T15:00:00.000Z",
    );

    expect(tool).not.toBeNull();
    expect(tool?.metadata).toMatchObject({
      native: true,
      packageCandidate: true,
      routePath: "/api/tools/paraphrase",
      uiHref: "/paraphrase",
      internalToolName: "paraphrase",
      category: "writing",
      contentIntegritySensitive: true,
    });
  });

  it("supports native-tool lookup helpers", () => {
    expect(
      getShothikNativeMcpToolDefinition("shothik.analysis.detect_ai_text"),
    ).toMatchObject({
      title: "Detect AI Text",
      routePath: "/api/tools/ai-detector",
    });
    expect(isShothikNativeMcpTool("shothik.humanize.rewrite_humanized_text")).toBe(
      true,
    );
    expect(isPublicShothikNativeMcpTool("shothik.twin.execute_task")).toBe(false);
    expect(isPublicShothikNativeMcpTool("shothik.twin.create_forum")).toBe(false);
    expect(isPublicShothikNativeMcpTool("shothik.twin.create_forum_post")).toBe(false);
    expect(isPublicShothikNativeMcpTool("shothik.twin.execute_book_write")).toBe(false);
    expect(isPublicShothikNativeMcpTool("shothik.twin.publish_book")).toBe(false);
    expect(isPublicShothikNativeMcpTool("shothik.twin.post_community_preview")).toBe(false);
    expect(isShothikNativeMcpTool("unknown.tool")).toBe(false);
  });
});
