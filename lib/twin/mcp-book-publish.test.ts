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
  invokeTwinBookPublish,
  TWIN_BOOK_PUBLISH_TOOL_NAME,
} from './mcp-book-publish';

describe('invokeTwinBookPublish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the governed MCP book-publish tool with confirmation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_BOOK_PUBLISH_TOOL_NAME,
      status: 'success',
      output: {
        bookId: 'book-1',
        status: 'published',
        previousState: 'approved',
        newState: 'published',
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

    const result = await invokeTwinBookPublish({
      tenantId: 'user-1',
      userId: 'user-1',
      bookId: 'book-1',
      confirmationToken: 'approval_granted',
      traceId: 'trace-1',
    });

    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'user-1',
        userId: 'user-1',
        toolName: TWIN_BOOK_PUBLISH_TOOL_NAME,
        arguments: {
          bookId: 'book-1',
        },
        confirmationToken: 'approval_granted',
        origin: 'api_route',
      }),
    );
    expect(result).toMatchObject({
      bookId: 'book-1',
      status: 'published',
      invocationId: 'invocation-1',
    });
  });

  it('throws when gateway policy blocks book publish', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_BOOK_PUBLISH_TOOL_NAME,
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
      invokeTwinBookPublish({
        tenantId: 'user-1',
        userId: 'user-1',
        bookId: 'book-1',
        confirmationToken: '',
      }),
    ).rejects.toThrow(/explicit confirmation/i);
  });
});
