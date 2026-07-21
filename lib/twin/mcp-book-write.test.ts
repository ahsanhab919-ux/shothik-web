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
  invokeTwinBookWrite,
  TWIN_BOOK_WRITE_TOOL_NAME,
} from './mcp-book-write';

describe('invokeTwinBookWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the governed MCP book-write tool with confirmation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_BOOK_WRITE_TOOL_NAME,
      status: 'success',
      output: {
        operation: 'upload',
        bookId: 'book-1',
        status: 'state_advanced',
        previousState: 'draft',
        newState: 'agent_generated',
      },
      outputText: null,
      policyDecision: {
        decision: 'allow',
        reasonCode: null,
        matchedPolicyIds: [],
        effectiveRiskTier: 'high',
      },
      metrics: { durationMs: 5, retries: 0 },
    });

    const result = await invokeTwinBookWrite({
      tenantId: 'user-1',
      userId: 'user-1',
      bookWrite: {
        operation: 'upload',
        bookId: 'book-1',
        content: 'Governed draft content',
      },
      confirmationToken: 'approval_granted',
      traceId: 'trace-1',
    });

    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'user-1',
        userId: 'user-1',
        toolName: TWIN_BOOK_WRITE_TOOL_NAME,
        arguments: {
          operation: 'upload',
          bookId: 'book-1',
          content: 'Governed draft content',
        },
        confirmationToken: 'approval_granted',
        origin: 'api_route',
      }),
    );
    expect(result).toMatchObject({
      operation: 'upload',
      bookId: 'book-1',
      status: 'state_advanced',
      invocationId: 'invocation-1',
    });
  });

  it('throws when gateway policy blocks book write', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_BOOK_WRITE_TOOL_NAME,
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
      invokeTwinBookWrite({
        tenantId: 'user-1',
        userId: 'user-1',
        bookWrite: {
          operation: 'start',
          title: 'Pending approval draft',
        },
        confirmationToken: '',
      }),
    ).rejects.toThrow(/explicit confirmation/i);
  });
});
