import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  needsApproval: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  invokeTwinCommunityPreview: vi.fn(),
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

vi.mock("@/lib/twin/mcp-community-preview", () => ({
  TWIN_COMMUNITY_PREVIEW_TOOL_NAME: "shothik.twin.post_community_preview",
  invokeTwinCommunityPreview: mocks.invokeTwinCommunityPreview,
}));

import { POST } from "../route";

describe("POST /api/twin/book/community-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireTwinKey.mockReturnValue(true);
    mocks.needsApproval.mockReturnValue(false);
    mocks.createTwinClient.mockReturnValue({
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

  it("queues governed approval when community preview requires approval", async () => {
    mocks.needsApproval.mockReturnValue(true);
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
        forumId: "forum-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Community preview queued for master approval.",
    });
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        action: "community:preview",
        payload: {
          bookId: "book-1",
          forumId: "forum-1",
          governedInvocation: {
            toolName: "shothik.twin.post_community_preview",
            confirmationRequired: true,
          },
        },
      }),
    );
  });

  it("executes community preview through the governed MCP helper", async () => {
    mocks.invokeTwinCommunityPreview.mockResolvedValue({
      postId: "post-1",
      bookId: "book-1",
      forumId: "forum-1",
      status: "community_preview_posted",
      previousState: "published",
      newState: "community_preview_posted",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
        forumId: "forum-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      postId: "post-1",
      contentState: "community_preview_posted",
      previousState: "published",
      invocationId: "invocation-1",
      message: "Community preview posted to forum successfully.",
    });
    expect(mocks.invokeTwinCommunityPreview).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookId: "book-1",
      forumId: "forum-1",
      confirmationToken: "user_confirmed",
      traceId: "twin-community-preview:twin-1:book-1:forum-1",
    });
  });
});
