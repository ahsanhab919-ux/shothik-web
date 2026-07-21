import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_BOOK_WRITE_TOOL_NAME = 'shothik.twin.execute_book_write';

export type TwinBookWriteOperation = 'start' | 'upload' | 'metadata';

export interface TwinBookWriteStartInput {
  operation: 'start';
  title: string;
  description?: string;
  category?: string;
  language?: string;
}

export interface TwinBookWriteUploadInput {
  operation: 'upload';
  bookId: string;
  content: string;
}

export interface TwinBookWriteMetadataInput {
  operation: 'metadata';
  bookId: string;
  title?: string;
  subtitle?: string;
  description?: string;
  category?: string;
  language?: string;
  keywords?: string[];
}

export type TwinBookWriteInput =
  | TwinBookWriteStartInput
  | TwinBookWriteUploadInput
  | TwinBookWriteMetadataInput;

export interface TwinBookWriteResult {
  operation: TwinBookWriteOperation;
  bookId: string;
  status: string;
  previousState?: string | null;
  newState?: string | null;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinBookWriteInput {
  tenantId: string;
  userId: string;
  bookWrite: TwinBookWriteInput;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinBookWrite(
  input: InvokeTwinBookWriteInput,
): Promise<TwinBookWriteResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_BOOK_WRITE_TOOL_NAME,
    arguments: {
      ...input.bookWrite,
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin book write requires explicit confirmation.'
        : 'Twin book write was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin book write failed.');
  }

  const output = asTwinBookWriteOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinBookWriteOutput(
  output: unknown,
): Omit<TwinBookWriteResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin book write returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    (candidate.operation !== 'start' &&
      candidate.operation !== 'upload' &&
      candidate.operation !== 'metadata') ||
    typeof candidate.bookId !== 'string' ||
    typeof candidate.status !== 'string'
  ) {
    throw new Error('Twin book write returned an incomplete payload.');
  }

  return {
    operation: candidate.operation,
    bookId: candidate.bookId,
    status: candidate.status,
    previousState:
      typeof candidate.previousState === 'string' ? candidate.previousState : null,
    newState: typeof candidate.newState === 'string' ? candidate.newState : null,
  };
}
