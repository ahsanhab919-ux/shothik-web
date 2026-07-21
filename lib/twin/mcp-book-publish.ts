import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_BOOK_PUBLISH_TOOL_NAME = 'shothik.twin.publish_book';

export interface TwinBookPublishResult {
  bookId: string;
  status: string;
  previousState?: string | null;
  newState?: string | null;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinBookPublishInput {
  tenantId: string;
  userId: string;
  bookId: string;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinBookPublish(
  input: InvokeTwinBookPublishInput,
): Promise<TwinBookPublishResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_BOOK_PUBLISH_TOOL_NAME,
    arguments: {
      bookId: input.bookId,
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin book publishing requires explicit confirmation.'
        : 'Twin book publishing was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin book publishing failed.');
  }

  const output = asTwinBookPublishOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinBookPublishOutput(
  output: unknown,
): Omit<TwinBookPublishResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin book publishing returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.bookId !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    throw new Error('Twin book publishing returned an incomplete payload.');
  }

  return {
    bookId: candidate.bookId,
    status: candidate.status,
    previousState:
      typeof candidate.previousState === 'string' ? candidate.previousState : null,
    newState: typeof candidate.newState === 'string' ? candidate.newState : null,
  };
}
