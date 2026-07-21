import { createCreativeStudioGateway } from '@/lib/mcp/runtime';
import { resolveShothikNativeConnectorId } from '@/lib/mcp/connectors/shothik-native';

export const TWIN_TASK_EXECUTION_TOOL_NAME = 'shothik.twin.execute_task';

export interface TwinTaskExecutionResult {
  taskId: string;
  status: string;
  result: string;
  voiceDriftFindings: unknown[];
  voiceGatePassed: boolean;
  repairAttempts: number;
  bestEffort: boolean;
  invocationId: string;
  connectorId: string;
}

interface InvokeTwinTaskExecutionInput {
  tenantId: string;
  userId: string;
  taskId: string;
  confirmationToken: string;
  traceId?: string;
}

export async function invokeTwinTaskExecution(
  input: InvokeTwinTaskExecutionInput,
): Promise<TwinTaskExecutionResult> {
  const gateway = createCreativeStudioGateway();
  const connectorId = resolveShothikNativeConnectorId(input.tenantId);

  const invocation = await gateway.invokeTool({
    tenantId: input.tenantId,
    userId: input.userId,
    origin: 'api_route',
    connectorId,
    toolName: TWIN_TASK_EXECUTION_TOOL_NAME,
    arguments: {
      taskId: input.taskId,
    },
    confirmationToken: input.confirmationToken,
    traceId: input.traceId,
  });

  if (invocation.status === 'blocked') {
    throw new Error(
      invocation.policyDecision.reasonCode === 'confirmation_required'
        ? 'Twin task execution requires explicit confirmation.'
        : 'Twin task execution was blocked by policy.',
    );
  }

  if (invocation.status === 'failed') {
    throw new Error(invocation.error?.message ?? 'Twin task execution failed.');
  }

  const output = asTwinTaskExecutionOutput(invocation.output);

  return {
    ...output,
    invocationId: invocation.invocationId,
    connectorId: invocation.connectorId,
  };
}

function asTwinTaskExecutionOutput(output: unknown): Omit<TwinTaskExecutionResult, 'invocationId' | 'connectorId'> {
  if (!output || typeof output !== 'object') {
    throw new Error('Twin task execution returned an invalid payload.');
  }

  const candidate = output as Record<string, unknown>;
  if (
    typeof candidate.taskId !== 'string' ||
    typeof candidate.status !== 'string' ||
    typeof candidate.result !== 'string'
  ) {
    throw new Error('Twin task execution returned an incomplete payload.');
  }

  return {
    taskId: candidate.taskId,
    status: candidate.status,
    result: candidate.result,
    voiceDriftFindings: Array.isArray(candidate.voiceDriftFindings)
      ? candidate.voiceDriftFindings
      : [],
    voiceGatePassed: Boolean(candidate.voiceGatePassed),
    repairAttempts:
      typeof candidate.repairAttempts === 'number' ? candidate.repairAttempts : 0,
    bestEffort: Boolean(candidate.bestEffort),
  };
}

