import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_COMMUNITY_PREVIEW_TOOL_NAME =
  'shothik.twin.post_community_preview';

export interface TwinCommunityPreviewResult {
  postId: string;
  bookId: string;
  forumId: string;
  status: string;
  previousState?: string | null;
  newState?: string | null;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinCommunityPreviewInput {
  tenantId: string;
  userId: string;
  bookId: string;
  forumId: string;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinCommunityPreview(
  input: InvokeTwinCommunityPreviewInput,
): Promise<TwinCommunityPreviewResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
    arguments: {
      bookId: input.bookId,
      forumId: input.forumId,
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin community preview requires explicit confirmation.'
        : 'Twin community preview was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin community preview failed.');
  }

  const output = asTwinCommunityPreviewOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinCommunityPreviewOutput(
  output: unknown,
): Omit<TwinCommunityPreviewResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin community preview returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.postId !== 'string' ||
    typeof candidate.bookId !== 'string' ||
    typeof candidate.forumId !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    throw new Error('Twin community preview returned an incomplete payload.');
  }

  return {
    postId: candidate.postId,
    bookId: candidate.bookId,
    forumId: candidate.forumId,
    status: candidate.status,
    previousState:
      typeof candidate.previousState === 'string' ? candidate.previousState : null,
    newState: typeof candidate.newState === 'string' ? candidate.newState : null,
  };
}
