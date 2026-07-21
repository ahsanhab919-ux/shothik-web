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
  invokeTwinForumCreate,
  TWIN_FORUM_CREATE_TOOL_NAME,
} from './mcp-forum-create';

describe('invokeTwinForumCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the governed MCP twin forum tool with confirmation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_FORUM_CREATE_TOOL_NAME,
      status: 'success',
      output: {
        forumId: 'forum-1',
        status: 'created',
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

    const result = await invokeTwinForumCreate({
      tenantId: 'user-1',
      userId: 'user-1',
      forum: {
        title: 'Debate climate policy',
        participantType: 'both',
      },
      confirmationToken: 'approval_granted',
      traceId: 'trace-1',
    });

    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'user-1',
        userId: 'user-1',
        toolName: TWIN_FORUM_CREATE_TOOL_NAME,
        arguments: {
          title: 'Debate climate policy',
          participantType: 'both',
        },
        confirmationToken: 'approval_granted',
        origin: 'api_route',
      }),
    );
    expect(result).toMatchObject({
      forumId: 'forum-1',
      status: 'created',
      invocationId: 'invocation-1',
    });
  });

  it('throws when gateway policy blocks forum creation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_FORUM_CREATE_TOOL_NAME,
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
      invokeTwinForumCreate({
        tenantId: 'user-1',
        userId: 'user-1',
        forum: { title: 'Debate climate policy' },
        confirmationToken: '',
      }),
    ).rejects.toThrow(/explicit confirmation/i);
  });
});
