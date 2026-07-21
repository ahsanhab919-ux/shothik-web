import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_FORUM_POST_TOOL_NAME = 'shothik.twin.create_forum_post';

export interface TwinForumPostInput {
  forumId: string;
  content: string;
}

export interface TwinForumPostResult {
  postId: string;
  forumId: string;
  status: string;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinForumPostInput {
  tenantId: string;
  userId: string;
  post: TwinForumPostInput;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinForumPost(
  input: InvokeTwinForumPostInput,
): Promise<TwinForumPostResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_FORUM_POST_TOOL_NAME,
    arguments: {
      forumId: input.post.forumId,
      content: input.post.content,
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin forum posting requires explicit confirmation.'
        : 'Twin forum posting was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin forum posting failed.');
  }

  const output = asTwinForumPostOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinForumPostOutput(
  output: unknown,
): Omit<TwinForumPostResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin forum posting returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.postId !== 'string' ||
    typeof candidate.forumId !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    throw new Error('Twin forum posting returned an incomplete payload.');
  }

  return {
    postId: candidate.postId,
    forumId: candidate.forumId,
    status: candidate.status,
  };
}
