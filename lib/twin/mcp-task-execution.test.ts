import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInvokeTool } = vi.hoisted(() => ({
  mockInvokeTool: vi.fn(),
}));

vi.mock('@/lib/mcp/runtime', () => ({
  createCreativeStudioGateway: () => ({
    invokeTool: mockInvokeTool,
  }),
}));

import {
  invokeTwinTaskExecution,
  TWIN_TASK_EXECUTION_TOOL_NAME,
} from './mcp-task-execution';

describe('invokeTwinTaskExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the governed MCP twin-task tool with confirmation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_TASK_EXECUTION_TOOL_NAME,
      status: 'success',
      output: {
        taskId: 'task-1',
        status: 'completed',
        result: 'Done',
        voiceDriftFindings: [],
        voiceGatePassed: true,
        repairAttempts: 0,
        bestEffort: false,
      },
      outputText: null,
      policyDecision: { decision: 'allow', reasonCode: null, matchedPolicyIds: [], effectiveRiskTier: 'high' },
      metrics: { durationMs: 5, retries: 0 },
    });

    const result = await invokeTwinTaskExecution({
      tenantId: 'user-1',
      userId: 'user-1',
      taskId: 'task-1',
      confirmationToken: 'approval_granted',
      traceId: 'trace-1',
    });

    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'user-1',
        userId: 'user-1',
        toolName: TWIN_TASK_EXECUTION_TOOL_NAME,
        arguments: { taskId: 'task-1' },
        confirmationToken: 'approval_granted',
        origin: 'api_route',
      }),
    );
    expect(result).toMatchObject({
      taskId: 'task-1',
      status: 'completed',
      result: 'Done',
      invocationId: 'invocation-1',
    });
  });

  it('throws when gateway policy blocks execution', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_TASK_EXECUTION_TOOL_NAME,
      status: 'blocked',
      output: null,
      policyDecision: {
        decision: 'confirm_required',
        reasonCode: 'confirmation_required',
        matchedPolicyIds: [],
        effectiveRiskTier: 'high',
      },
      metrics: { durationMs: 1, retries: 0 },
    });

    await expect(
      invokeTwinTaskExecution({
        tenantId: 'user-1',
        userId: 'user-1',
        taskId: 'task-1',
        confirmationToken: '',
      }),
    ).rejects.toThrow(/explicit confirmation/i);
  });
});

