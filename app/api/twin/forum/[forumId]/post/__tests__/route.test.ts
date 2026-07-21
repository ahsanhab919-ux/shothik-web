import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  needsApproval: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  query: vi.fn(),
  invokeTwinForumPost: vi.fn(),
}));

vi.mock("@/lib/twin-api-auth", () => ({
  authenticateTwinRequest: mocks.authenticateTwinRequest,
  requireTwinKey: mocks.requireTwinKey,
  needsApproval: mocks.needsApproval,
}));

vi.mock("@/lib/twin-convex", () => ({
  twinApi: {
    twin: {
      createPendingApproval: "createPendingApproval",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

vi.mock("@/lib/twin/mcp-forum-post", () => ({
  TWIN_FORUM_POST_TOOL_NAME: "shothik.twin.create_forum_post",
  invokeTwinForumPost: mocks.invokeTwinForumPost,
}));

import { POST } from "../route";

describe("POST /api/twin/forum/[forumId]/post", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireTwinKey.mockReturnValue(true);
    mocks.needsApproval.mockReturnValue(false);
    mocks.createTwinClient.mockReturnValue({
      query: mocks.query,
      mutation: mocks.mutation,
    });
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      twin: {
        masterId: "user-1",
        approvalRequiredActions: [],
      },
      keyHash: "key-hash",
      ability: {
        can: vi.fn().mockReturnValue(true),
      },
    });
  });

  it("queues a governed approval instead of executing when forum posting requires approval", async () => {
    mocks.needsApproval.mockReturnValue(true);
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST(
      {
        json: async () => ({
          content: "Pending moderated post",
        }),
      } as any,
      { params: Promise.resolve({ forumId: "forum-1" }) },
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Forum post queued for master approval.",
    });
    expect(mocks.invokeTwinForumPost).not.toHaveBeenCalled();
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        twinId: "twin-1",
        masterId: "user-1",
        action: "forum:post",
        payload: {
          forumId: "forum-1",
          content: "Pending moderated post",
          governedInvocation: {
            toolName: "shothik.twin.create_forum_post",
            confirmationRequired: true,
          },
        },
        keyHash: "key-hash",
      }),
    );
  });

  it("executes forum posting through the governed MCP helper", async () => {
    mocks.invokeTwinForumPost.mockResolvedValue({
      postId: "post-1",
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST(
      {
        json: async () => ({
          content: "Governed forum reply",
        }),
      } as any,
      { params: Promise.resolve({ forumId: "forum-1" }) },
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: false,
      postId: "post-1",
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-1",
      message: "Forum post created.",
    });
    expect(mocks.invokeTwinForumPost).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      post: {
        forumId: "forum-1",
        content: "Governed forum reply",
      },
      confirmationToken: "user_confirmed",
      traceId: "twin-forum-post:twin-1:forum-1",
    });
  });
});
