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
  invokeTwinCommunityPreview,
  TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
} from './mcp-community-preview';

describe('invokeTwinCommunityPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes the governed MCP community-preview tool with confirmation', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-1',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
      status: 'success',
      output: {
        postId: 'post-1',
        bookId: 'book-1',
        forumId: 'forum-1',
        status: 'community_preview_posted',
        previousState: 'published',
        newState: 'community_preview_posted',
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

    const result = await invokeTwinCommunityPreview({
      tenantId: 'user-1',
      userId: 'user-1',
      bookId: 'book-1',
      forumId: 'forum-1',
      confirmationToken: 'approval_granted',
      traceId: 'trace-1',
    });

    expect(mockInvokeTool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'user-1',
        userId: 'user-1',
        toolName: TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
        arguments: {
          bookId: 'book-1',
          forumId: 'forum-1',
        },
        confirmationToken: 'approval_granted',
        origin: 'api_route',
      }),
    );
    expect(result).toMatchObject({
      postId: 'post-1',
      bookId: 'book-1',
      forumId: 'forum-1',
      status: 'community_preview_posted',
      invocationId: 'invocation-1',
    });
  });

  it('throws when gateway policy blocks community preview', async () => {
    mockInvokeTool.mockResolvedValue({
      invocationId: 'invocation-2',
      connectorId: 'shothik-native:user-1',
      toolName: TWIN_COMMUNITY_PREVIEW_TOOL_NAME,
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
      invokeTwinCommunityPreview({
        tenantId: 'user-1',
        userId: 'user-1',
        bookId: 'book-1',
        forumId: 'forum-1',
        confirmationToken: '',
      }),
    ).rejects.toThrow(/explicit confirmation/i);
  });
});
