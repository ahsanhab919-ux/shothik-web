import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireAuth: vi.fn(),
  createTwinClient: vi.fn(),
  checkAbility: vi.fn(),
  logRouteActivity: vi.fn(),
  invokeTwinTaskExecution: vi.fn(),
  invokeTwinForumCreate: vi.fn(),
  invokeTwinForumPost: vi.fn(),
  invokeTwinBookWrite: vi.fn(),
  invokeTwinBookPublish: vi.fn(),
  invokeTwinCommunityPreview: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("@/lib/twin-api-auth", () => ({
  authenticateTwinRequest: mocks.authenticateTwinRequest,
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/twin-convex", () => ({
  twinApi: {
    twin: {
      getPendingApprovals: "getPendingApprovals",
      approveAction: "approveAction",
      rejectAction: "rejectAction",
      updateTaskStatus: "updateTaskStatus",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

vi.mock("@/lib/twin-route-guard", () => ({
  checkAbility: mocks.checkAbility,
  logRouteActivity: mocks.logRouteActivity,
}));

vi.mock("@/lib/twin/mcp-task-execution", () => ({
  invokeTwinTaskExecution: mocks.invokeTwinTaskExecution,
}));

vi.mock("@/lib/twin/mcp-forum-create", () => ({
  TWIN_FORUM_CREATE_TOOL_NAME: "shothik.twin.create_forum",
  invokeTwinForumCreate: mocks.invokeTwinForumCreate,
}));

vi.mock("@/lib/twin/mcp-forum-post", () => ({
  TWIN_FORUM_POST_TOOL_NAME: "shothik.twin.create_forum_post",
  invokeTwinForumPost: mocks.invokeTwinForumPost,
}));

vi.mock("@/lib/twin/mcp-book-write", () => ({
  TWIN_BOOK_WRITE_TOOL_NAME: "shothik.twin.execute_book_write",
  invokeTwinBookWrite: mocks.invokeTwinBookWrite,
}));

vi.mock("@/lib/twin/mcp-book-publish", () => ({
  TWIN_BOOK_PUBLISH_TOOL_NAME: "shothik.twin.publish_book",
  invokeTwinBookPublish: mocks.invokeTwinBookPublish,
}));

vi.mock("@/lib/twin/mcp-community-preview", () => ({
  TWIN_COMMUNITY_PREVIEW_TOOL_NAME: "shothik.twin.post_community_preview",
  invokeTwinCommunityPreview: mocks.invokeTwinCommunityPreview,
}));

import { POST } from "../route";

describe("POST /api/twin/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAuth.mockReturnValue(true);
    mocks.checkAbility.mockReturnValue(null);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "user_session",
      token: "jwt-token",
      userId: "user-1",
    });
    mocks.logRouteActivity.mockResolvedValue(undefined);
  });

  it("executes governed forum creation after approval", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "approval-1",
        payload: {
          title: "Open policy debate",
          description: "Structured argument review",
          participantType: "both",
          governedInvocation: {
            toolName: "shothik.twin.create_forum",
            confirmationRequired: true,
          },
        },
      },
    ]);
    mocks.mutation.mockResolvedValue({ approved: true });
    mocks.invokeTwinForumCreate.mockResolvedValue({
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        approvalId: "approval-1",
        action: "approve",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenCalledWith("approveAction", {
      approvalId: "approval-1",
    });
    expect(mocks.invokeTwinForumCreate).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      forum: {
        title: "Open policy debate",
        description: "Structured argument review",
        participantType: "both",
      },
      confirmationToken: "approval_granted",
      traceId: "twin-approval:approval-1:forum-create",
    });
    expect(data).toEqual({
      success: true,
      voiceDriftFindings: [],
      voiceGatePassed: true,
      repairAttempts: 0,
      bestEffort: false,
      forumCreation: {
        forumId: "forum-1",
        status: "created",
        invocationId: "invocation-1",
      },
    });
  });

  it("executes governed forum posting after approval", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "approval-2",
        payload: {
          forumId: "forum-1",
          content: "Approved forum reply",
          governedInvocation: {
            toolName: "shothik.twin.create_forum_post",
            confirmationRequired: true,
          },
        },
      },
    ]);
    mocks.mutation.mockResolvedValue({ approved: true });
    mocks.invokeTwinForumPost.mockResolvedValue({
      postId: "post-1",
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-2",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        approvalId: "approval-2",
        action: "approve",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.invokeTwinForumPost).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      post: {
        forumId: "forum-1",
        content: "Approved forum reply",
      },
      confirmationToken: "approval_granted",
      traceId: "twin-approval:approval-2:forum-post",
    });
    expect(data).toEqual({
      success: true,
      voiceDriftFindings: [],
      voiceGatePassed: true,
      repairAttempts: 0,
      bestEffort: false,
      forumPost: {
        postId: "post-1",
        forumId: "forum-1",
        status: "created",
        invocationId: "invocation-2",
      },
    });
  });

  it("executes governed book write after approval", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "approval-3",
        payload: {
          operation: "metadata",
          bookId: "book-1",
          title: "Finalized Draft",
          governedInvocation: {
            toolName: "shothik.twin.execute_book_write",
            confirmationRequired: true,
          },
        },
      },
    ]);
    mocks.mutation.mockResolvedValue({ approved: true });
    mocks.invokeTwinBookWrite.mockResolvedValue({
      operation: "metadata",
      bookId: "book-1",
      status: "state_advanced",
      previousState: "agent_generated",
      newState: "pending_master_review",
      invocationId: "invocation-3",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        approvalId: "approval-3",
        action: "approve",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.invokeTwinBookWrite).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookWrite: {
        operation: "metadata",
        bookId: "book-1",
        title: "Finalized Draft",
      },
      confirmationToken: "approval_granted",
      traceId: "twin-approval:approval-3:book-write",
    });
    expect(data).toEqual({
      success: true,
      voiceDriftFindings: [],
      voiceGatePassed: true,
      repairAttempts: 0,
      bestEffort: false,
      bookWrite: {
        operation: "metadata",
        bookId: "book-1",
        status: "state_advanced",
        invocationId: "invocation-3",
        previousState: "agent_generated",
        newState: "pending_master_review",
      },
    });
  });

  it("executes governed book publish after approval", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "approval-4",
        payload: {
          bookId: "book-1",
          governedInvocation: {
            toolName: "shothik.twin.publish_book",
            confirmationRequired: true,
          },
        },
      },
    ]);
    mocks.mutation.mockResolvedValue({ approved: true });
    mocks.invokeTwinBookPublish.mockResolvedValue({
      bookId: "book-1",
      status: "published",
      previousState: "approved",
      newState: "published",
      invocationId: "invocation-4",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        approvalId: "approval-4",
        action: "approve",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.invokeTwinBookPublish).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookId: "book-1",
      confirmationToken: "approval_granted",
      traceId: "twin-approval:approval-4:book-publish",
    });
    expect(data).toEqual({
      success: true,
      voiceDriftFindings: [],
      voiceGatePassed: true,
      repairAttempts: 0,
      bestEffort: false,
      bookPublish: {
        bookId: "book-1",
        status: "published",
        invocationId: "invocation-4",
        previousState: "approved",
        newState: "published",
      },
    });
  });

  it("executes governed community preview after approval", async () => {
    mocks.query.mockResolvedValue([
      {
        _id: "approval-5",
        payload: {
          bookId: "book-1",
          forumId: "forum-1",
          governedInvocation: {
            toolName: "shothik.twin.post_community_preview",
            confirmationRequired: true,
          },
        },
      },
    ]);
    mocks.mutation.mockResolvedValue({ approved: true });
    mocks.invokeTwinCommunityPreview.mockResolvedValue({
      postId: "post-1",
      bookId: "book-1",
      forumId: "forum-1",
      status: "community_preview_posted",
      previousState: "published",
      newState: "community_preview_posted",
      invocationId: "invocation-5",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        approvalId: "approval-5",
        action: "approve",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.invokeTwinCommunityPreview).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookId: "book-1",
      forumId: "forum-1",
      confirmationToken: "approval_granted",
      traceId: "twin-approval:approval-5:community-preview",
    });
    expect(data).toEqual({
      success: true,
      voiceDriftFindings: [],
      voiceGatePassed: true,
      repairAttempts: 0,
      bestEffort: false,
      communityPreview: {
        postId: "post-1",
        bookId: "book-1",
        forumId: "forum-1",
        status: "community_preview_posted",
        invocationId: "invocation-5",
        previousState: "published",
        newState: "community_preview_posted",
      },
    });
  });
});
