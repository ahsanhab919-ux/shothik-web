import type { MCPConnectorRiskTier, MCPToolDescriptor } from "./gateway-contract";
import { resolveShothikNativeConnectorId } from "./connectors/shothik-native";

type NativeToolRoute =
  | "/api/tools/grammar"
  | "/api/tools/summarize"
  | "/api/tools/translator"
  | "/api/tools/paraphrase"
  | "/api/tools/ai-detector"
  | "/api/humanizerV5"
  | "/api/twin/tasks/execute"
  | "/api/twin/forum/execute"
  | "/api/twin/forum/post/execute"
  | "/api/twin/book/write/execute"
  | "/api/twin/book/publish/execute"
  | "/api/twin/book/community-preview/execute";

type NativeToolHref =
  | "/grammar-checker"
  | "/summarize"
  | "/translator"
  | "/paraphrase"
  | "/ai-detector"
  | "/humanize-gpt"
  | "/twin";

type InternalToolName =
  | "grammar"
  | "summarize"
  | "translator"
  | "paraphrase"
  | "ai-detector"
  | "humanize"
  | "twin-task"
  | "twin-forum-create"
  | "twin-forum-post"
  | "twin-book-write"
  | "twin-book-publish"
  | "twin-community-preview";

export type ShothikNativeMcpToolName =
  | "shothik.grammar.check_text"
  | "shothik.summarize.summarize_text"
  | "shothik.translator.translate_text"
  | "shothik.paraphrase.rewrite_text"
  | "shothik.analysis.detect_ai_text"
  | "shothik.humanize.rewrite_humanized_text"
  | "shothik.twin.execute_task"
  | "shothik.twin.create_forum"
  | "shothik.twin.create_forum_post"
  | "shothik.twin.execute_book_write"
  | "shothik.twin.publish_book"
  | "shothik.twin.post_community_preview";

export interface ShothikNativeToolDefinition {
  name: ShothikNativeMcpToolName;
  title: string;
  description: string;
  category: "writing" | "analysis" | "language" | "agent";
  routePath: NativeToolRoute;
  uiHref: NativeToolHref;
  internalToolName: InternalToolName;
  mutationMode: "read" | "write" | "admin";
  riskTier: MCPConnectorRiskTier;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

const STRING_SCHEMA = { type: "string" } as const;
const BOOLEAN_SCHEMA = { type: "boolean" } as const;

const TEXT_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 10000,
} as const;

function buildObjectSchema(
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

export const SHOTHIK_NATIVE_TOOL_DEFINITIONS: readonly ShothikNativeToolDefinition[] =
  [
    {
      name: "shothik.grammar.check_text",
      title: "Grammar Checker",
      description:
        "Check text for grammar, spelling, punctuation, and style issues and return corrected text plus issue annotations.",
      category: "writing",
      routePath: "/api/tools/grammar",
      uiHref: "/grammar-checker",
      internalToolName: "grammar",
      mutationMode: "read",
      riskTier: "low",
      inputSchema: buildObjectSchema(
        {
          text: TEXT_SCHEMA,
          language: {
            type: "string",
            default: "en",
          },
        },
        ["text"],
      ),
      outputSchema: buildObjectSchema(
        {
          success: BOOLEAN_SCHEMA,
          text: STRING_SCHEMA,
          correctedText: STRING_SCHEMA,
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: STRING_SCHEMA,
                type: {
                  type: "string",
                  enum: ["grammar", "spelling", "style", "punctuation"],
                },
                message: STRING_SCHEMA,
                suggestion: STRING_SCHEMA,
                context: STRING_SCHEMA,
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
              },
              required: ["id", "type", "message", "suggestion", "context", "severity"],
            },
          },
          corrections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                original: STRING_SCHEMA,
                corrected: STRING_SCHEMA,
                explanation: STRING_SCHEMA,
              },
              required: ["original", "corrected", "explanation"],
            },
          },
        },
        ["success", "text", "correctedText", "issues", "corrections"],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
      },
    },
    {
      name: "shothik.summarize.summarize_text",
      title: "Summarize Text",
      description:
        "Summarize source text into key points, paragraphs, bullets, TL;DR, or academic abstract formats.",
      category: "writing",
      routePath: "/api/tools/summarize",
      uiHref: "/summarize",
      internalToolName: "summarize",
      mutationMode: "read",
      riskTier: "low",
      inputSchema: buildObjectSchema(
        {
          text: TEXT_SCHEMA,
          type: {
            type: "string",
            enum: ["key-points", "paragraph", "bullets", "tldr", "abstract"],
            default: "key-points",
          },
          length: {
            type: "string",
            enum: ["short", "medium", "long"],
            default: "medium",
          },
        },
        ["text"],
      ),
      outputSchema: buildObjectSchema(
        {
          success: BOOLEAN_SCHEMA,
          summary: STRING_SCHEMA,
          type: STRING_SCHEMA,
          length: STRING_SCHEMA,
          originalLength: {
            type: "number",
          },
          summaryLength: {
            type: "number",
          },
          compressionRatio: {
            type: "number",
          },
        },
        [
          "success",
          "summary",
          "type",
          "length",
          "originalLength",
          "summaryLength",
          "compressionRatio",
        ],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
      },
    },
    {
      name: "shothik.translator.translate_text",
      title: "Translate Text",
      description:
        "Translate text between supported languages while preserving formatting, citations, proper nouns, and technical terms.",
      category: "language",
      routePath: "/api/tools/translator",
      uiHref: "/translator",
      internalToolName: "translator",
      mutationMode: "read",
      riskTier: "low",
      inputSchema: buildObjectSchema(
        {
          text: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
          },
          sourceLang: {
            type: "string",
            minLength: 2,
            maxLength: 10,
          },
          targetLang: {
            type: "string",
            minLength: 2,
            maxLength: 10,
          },
        },
        ["text", "sourceLang", "targetLang"],
      ),
      outputSchema: buildObjectSchema(
        {
          success: BOOLEAN_SCHEMA,
          original: STRING_SCHEMA,
          translated: STRING_SCHEMA,
          sourceLang: STRING_SCHEMA,
          targetLang: STRING_SCHEMA,
        },
        ["success", "original", "translated", "sourceLang", "targetLang"],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
      },
    },
    {
      name: "shothik.paraphrase.rewrite_text",
      title: "Paraphrase Text",
      description:
        "Rewrite text in a selected style and strength while preserving citations, technical terms, and core meaning.",
      category: "writing",
      routePath: "/api/tools/paraphrase",
      uiHref: "/paraphrase",
      internalToolName: "paraphrase",
      mutationMode: "read",
      riskTier: "moderate",
      inputSchema: buildObjectSchema(
        {
          text: {
            type: "string",
            minLength: 10,
            maxLength: 5000,
          },
          mode: {
            type: "string",
            enum: ["standard", "academic", "casual", "creative", "fluency", "formal"],
            default: "standard",
          },
          strength: {
            type: "string",
            enum: ["light", "medium", "heavy"],
            default: "medium",
          },
          language: {
            type: "string",
            default: "en",
          },
        },
        ["text"],
      ),
      outputSchema: buildObjectSchema(
        {
          success: BOOLEAN_SCHEMA,
          original: STRING_SCHEMA,
          paraphrased: STRING_SCHEMA,
          alternatives: {
            type: "array",
            items: STRING_SCHEMA,
          },
          mode: STRING_SCHEMA,
          strength: STRING_SCHEMA,
          domain: STRING_SCHEMA,
          similarityScore: {
            type: "number",
          },
          qualityWarning: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          source: STRING_SCHEMA,
        },
        [
          "success",
          "original",
          "paraphrased",
          "alternatives",
          "mode",
          "strength",
          "domain",
          "similarityScore",
          "source",
        ],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
        contentIntegritySensitive: true,
      },
    },
    {
      name: "shothik.analysis.detect_ai_text",
      title: "Detect AI Text",
      description:
        "Analyze whether source text appears AI-generated and return scoring, confidence, and explanation indicators.",
      category: "analysis",
      routePath: "/api/tools/ai-detector",
      uiHref: "/ai-detector",
      internalToolName: "ai-detector",
      mutationMode: "read",
      riskTier: "moderate",
      inputSchema: buildObjectSchema(
        {
          text: TEXT_SCHEMA,
          detailed: {
            type: "boolean",
            default: false,
          },
        },
        ["text"],
      ),
      outputSchema: buildObjectSchema(
        {
          success: BOOLEAN_SCHEMA,
          text: STRING_SCHEMA,
          score: {
            type: "number",
          },
          isAIGenerated: BOOLEAN_SCHEMA,
          confidence: {
            type: "number",
          },
          analysis: STRING_SCHEMA,
          indicators: {
            type: "object",
            additionalProperties: true,
          },
        },
        ["success", "text", "score", "isAIGenerated", "confidence", "analysis", "indicators"],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
      },
    },
    {
      name: "shothik.humanize.rewrite_humanized_text",
      title: "Humanize Text",
      description:
        "Rewrite AI-like text to sound more natural and human-written while preserving meaning and source-language fidelity.",
      category: "writing",
      routePath: "/api/humanizerV5",
      uiHref: "/humanize-gpt",
      internalToolName: "humanize",
      mutationMode: "read",
      riskTier: "moderate",
      inputSchema: buildObjectSchema(
        {
          text: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
          },
          model: {
            type: "string",
            default: "panda",
          },
          level: {
            anyOf: [{ type: "number" }, { type: "string" }],
          },
          language: {
            type: "string",
            default: "en",
          },
        },
        ["text"],
      ),
      outputSchema: buildObjectSchema(
        {
          output: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: STRING_SCHEMA,
                aiPercentage: {
                  type: "number",
                },
                score: {
                  type: "number",
                },
                model: STRING_SCHEMA,
                language: STRING_SCHEMA,
              },
              required: ["text", "aiPercentage", "score", "model", "language"],
            },
          },
        },
        ["output"],
      ),
      metadata: {
        sideEffectFree: true,
        requiresUsageMetering: true,
        packageCandidate: true,
        contentIntegritySensitive: true,
      },
    },
    {
      name: "shothik.twin.execute_task",
      title: "Execute Twin Task",
      description:
        "Execute a persisted twin task, update task state, and return the governed voice-gated task result.",
      category: "agent",
      routePath: "/api/twin/tasks/execute",
      uiHref: "/twin",
      internalToolName: "twin-task",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: buildObjectSchema(
        {
          taskId: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
        },
        ["taskId"],
      ),
      outputSchema: buildObjectSchema(
        {
          taskId: STRING_SCHEMA,
          status: STRING_SCHEMA,
          result: STRING_SCHEMA,
          voiceDriftFindings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
          voiceGatePassed: BOOLEAN_SCHEMA,
          repairAttempts: {
            type: "number",
          },
          bestEffort: BOOLEAN_SCHEMA,
        },
        [
          "taskId",
          "status",
          "result",
          "voiceDriftFindings",
          "voiceGatePassed",
          "repairAttempts",
          "bestEffort",
        ],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
    {
      name: "shothik.twin.create_forum",
      title: "Create Twin Forum",
      description:
        "Create a twin-governed forum with the approved moderation, participation, and metadata settings.",
      category: "agent",
      routePath: "/api/twin/forum/execute",
      uiHref: "/twin",
      internalToolName: "twin-forum-create",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: buildObjectSchema(
        {
          title: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
          description: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          participantType: {
            type: "string",
            enum: ["agent_only", "human_only", "both"],
            default: "both",
          },
          category: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          language: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          votingMode: {
            anyOf: [
              {
                type: "string",
                enum: ["balance_of_probabilities", "beyond_reasonable_doubt"],
              },
              { type: "null" },
            ],
          },
          citationRequired: {
            anyOf: [BOOLEAN_SCHEMA, { type: "null" }],
          },
          agentBrief: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          agentOpinion: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
        },
        ["title"],
      ),
      outputSchema: buildObjectSchema(
        {
          forumId: STRING_SCHEMA,
          status: STRING_SCHEMA,
        },
        ["forumId", "status"],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
    {
      name: "shothik.twin.create_forum_post",
      title: "Create Twin Forum Post",
      description:
        "Create a twin-authored forum post under the governed MCP runtime with approval-aware controls.",
      category: "agent",
      routePath: "/api/twin/forum/post/execute",
      uiHref: "/twin",
      internalToolName: "twin-forum-post",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: buildObjectSchema(
        {
          forumId: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
          content: {
            type: "string",
            minLength: 1,
            maxLength: 2000,
          },
        },
        ["forumId", "content"],
      ),
      outputSchema: buildObjectSchema(
        {
          postId: STRING_SCHEMA,
          forumId: STRING_SCHEMA,
          status: STRING_SCHEMA,
        },
        ["postId", "forumId", "status"],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
    {
      name: "shothik.twin.execute_book_write",
      title: "Execute Twin Book Write",
      description:
        "Execute a governed twin book-write operation for draft creation, content upload, or metadata submission.",
      category: "agent",
      routePath: "/api/twin/book/write/execute",
      uiHref: "/twin",
      internalToolName: "twin-book-write",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          operation: {
            type: "string",
            enum: ["start", "upload", "metadata"],
          },
          title: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          description: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          category: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          language: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          bookId: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          content: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          subtitle: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          keywords: {
            type: "array",
            items: STRING_SCHEMA,
          },
        },
        required: ["operation"],
      },
      outputSchema: buildObjectSchema(
        {
          operation: STRING_SCHEMA,
          bookId: STRING_SCHEMA,
          status: STRING_SCHEMA,
          previousState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          newState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
        },
        ["operation", "bookId", "status"],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
    {
      name: "shothik.twin.publish_book",
      title: "Publish Twin Book",
      description:
        "Publish an approved twin-owned book through the governed MCP runtime.",
      category: "agent",
      routePath: "/api/twin/book/publish/execute",
      uiHref: "/twin",
      internalToolName: "twin-book-publish",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: buildObjectSchema(
        {
          bookId: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
        },
        ["bookId"],
      ),
      outputSchema: buildObjectSchema(
        {
          bookId: STRING_SCHEMA,
          status: STRING_SCHEMA,
          previousState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          newState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
        },
        ["bookId", "status"],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
    {
      name: "shothik.twin.post_community_preview",
      title: "Post Community Preview",
      description:
        "Post a twin-owned published book preview into a forum through the governed MCP runtime.",
      category: "agent",
      routePath: "/api/twin/book/community-preview/execute",
      uiHref: "/twin",
      internalToolName: "twin-community-preview",
      mutationMode: "write",
      riskTier: "high",
      inputSchema: buildObjectSchema(
        {
          bookId: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
          forumId: {
            type: "string",
            minLength: 1,
            maxLength: 200,
          },
        },
        ["bookId", "forumId"],
      ),
      outputSchema: buildObjectSchema(
        {
          postId: STRING_SCHEMA,
          bookId: STRING_SCHEMA,
          forumId: STRING_SCHEMA,
          status: STRING_SCHEMA,
          previousState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
          newState: {
            anyOf: [STRING_SCHEMA, { type: "null" }],
          },
        },
        ["postId", "bookId", "forumId", "status"],
      ),
      metadata: {
        sideEffectFree: false,
        requiresUsageMetering: false,
        packageCandidate: false,
        governedAgentAction: true,
        hostExposure: "internal",
      },
    },
  ] as const;

export function listShothikNativeMcpTools(
  tenantId: string,
  discoveredAt: string = new Date().toISOString(),
): MCPToolDescriptor[] {
  const connectorId = resolveShothikNativeConnectorId(tenantId);

  return SHOTHIK_NATIVE_TOOL_DEFINITIONS.map((definition) => ({
    connectorId,
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    mutationMode: definition.mutationMode,
    riskTier: definition.riskTier,
    status: "enabled",
    metadata: {
      category: definition.category,
      routePath: definition.routePath,
      uiHref: definition.uiHref,
      internalToolName: definition.internalToolName,
      native: true,
      packageCandidate: definition.metadata.packageCandidate ?? false,
      ...definition.metadata,
    },
    discoveredAt,
  }));
}

export function getShothikNativeMcpToolDefinition(
  toolName: string,
): ShothikNativeToolDefinition | null {
  return (
    SHOTHIK_NATIVE_TOOL_DEFINITIONS.find(
      (definition) => definition.name === toolName,
    ) ?? null
  );
}

export function getShothikNativeMcpTool(
  tenantId: string,
  toolName: string,
  discoveredAt?: string,
): MCPToolDescriptor | null {
  return (
    listShothikNativeMcpTools(tenantId, discoveredAt).find(
      (tool) => tool.name === toolName,
    ) ?? null
  );
}

export function isShothikNativeMcpTool(toolName: string): boolean {
  return getShothikNativeMcpToolDefinition(toolName) !== null;
}

export function isPublicShothikNativeMcpTool(toolName: string): boolean {
  const definition = getShothikNativeMcpToolDefinition(toolName);
  if (!definition) return false;
  return definition.metadata.hostExposure !== "internal";
}
