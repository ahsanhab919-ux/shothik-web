import type { MCPGateway } from './gateway-contract';
import { resolveHiggsfieldConnectorId } from './connectors/higgsfield';
import { createCreativeStudioGateway, getHiggsfieldRuntimeConfig } from './runtime';

export type CreativeStudioAssetType = 'image' | 'video';

export interface CreativeStudioWorkflowInput {
  tenantId: string;
  userId: string;
  prompt: string;
  assetType: CreativeStudioAssetType;
  style?: string;
  toolName?: string;
  confirmed?: boolean;
  dryRun?: boolean;
  traceId?: string;
}

export interface CreativeStudioWorkflowResult {
  status: 'success' | 'blocked' | 'failed';
  connectorId: string;
  toolName: string;
  confirmationRequired: boolean;
  policyReasonCode?: string | null;
  output: unknown;
  outputText?: string;
  invocationId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export async function runCreativeStudioWorkflow(
  input: CreativeStudioWorkflowInput,
  deps: { gateway?: MCPGateway } = {},
): Promise<CreativeStudioWorkflowResult> {
  const connectorId = resolveHiggsfieldConnectorId(input.tenantId);
  const toolName = selectCreativeStudioToolName(input.assetType, input.toolName);
  const gateway = deps.gateway;

  if (!input.dryRun && !gateway && !getHiggsfieldRuntimeConfig()) {
    return {
      status: 'failed',
      connectorId,
      toolName,
      confirmationRequired: false,
      output: null,
      error: {
        code: 'connector_not_configured',
        message:
          'Higgsfield MCP is not configured. Set HIGGSFIELD_MCP_URL and HIGGSFIELD_MCP_API_KEY before invoking Creative Studio.',
        retryable: false,
      },
    };
  }

  if (input.dryRun) {
    return {
      status: 'success',
      connectorId,
      toolName,
      confirmationRequired: false,
      output: {
        planned: true,
        connectorId,
        toolName,
        arguments: buildCreativeStudioArguments(input),
      },
    };
  }

  const resolvedGateway = gateway ?? createCreativeStudioGateway();
  const result = await resolvedGateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    connectorId,
    toolName,
    arguments: buildCreativeStudioArguments(input),
    confirmationToken: input.confirmed ? 'confirmed' : undefined,
    dryRun: input.dryRun,
    traceId: input.traceId,
    origin: 'api_route',
  });

  return {
    status: result.status,
    connectorId: result.connectorId,
    toolName: result.toolName,
    confirmationRequired:
      result.policyDecision.reasonCode === 'confirmation_required',
    policyReasonCode: result.policyDecision.reasonCode,
    output: result.output,
    outputText: result.outputText,
    invocationId: result.invocationId,
    error: result.error
      ? {
          code: result.error.code,
          message: result.error.message,
          retryable: result.error.retryable,
        }
      : undefined,
  };
}

export function selectCreativeStudioToolName(
  assetType: CreativeStudioAssetType,
  toolName?: string,
): string {
  if (toolName?.trim()) {
    return toolName.trim();
  }

  return assetType === 'video' ? 'generate_video' : 'generate_image';
}

function buildCreativeStudioArguments(
  input: CreativeStudioWorkflowInput,
): Record<string, unknown> {
  return {
    prompt: input.prompt,
    style: input.style ?? null,
    assetType: input.assetType,
  };
}
