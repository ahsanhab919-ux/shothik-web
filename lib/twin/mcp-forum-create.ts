import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_FORUM_CREATE_TOOL_NAME = 'shothik.twin.create_forum';

export interface TwinForumCreateInput {
  title: string;
  description?: string;
  participantType?: 'agent_only' | 'human_only' | 'both';
  category?: string;
  language?: string;
  votingMode?: 'balance_of_probabilities' | 'beyond_reasonable_doubt';
  citationRequired?: boolean;
  agentBrief?: string;
  agentOpinion?: string;
}

export interface TwinForumCreateResult {
  forumId: string;
  status: string;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinForumCreateInput {
  tenantId: string;
  userId: string;
  forum: TwinForumCreateInput;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinForumCreate(
  input: InvokeTwinForumCreateInput,
): Promise<TwinForumCreateResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_FORUM_CREATE_TOOL_NAME,
    arguments: {
      title: input.forum.title,
      ...(input.forum.description ? { description: input.forum.description } : {}),
      ...(input.forum.participantType
        ? { participantType: input.forum.participantType }
        : {}),
      ...(input.forum.category ? { category: input.forum.category } : {}),
      ...(input.forum.language ? { language: input.forum.language } : {}),
      ...(input.forum.votingMode ? { votingMode: input.forum.votingMode } : {}),
      ...(typeof input.forum.citationRequired === 'boolean'
        ? { citationRequired: input.forum.citationRequired }
        : {}),
      ...(input.forum.agentBrief ? { agentBrief: input.forum.agentBrief } : {}),
      ...(input.forum.agentOpinion ? { agentOpinion: input.forum.agentOpinion } : {}),
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin forum creation requires explicit confirmation.'
        : 'Twin forum creation was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin forum creation failed.');
  }

  const output = asTwinForumCreateOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinForumCreateOutput(
  output: unknown,
): Omit<TwinForumCreateResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin forum creation returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.forumId !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    throw new Error('Twin forum creation returned an incomplete payload.');
  }

  return {
    forumId: candidate.forumId,
    status: candidate.status,
  };
}
