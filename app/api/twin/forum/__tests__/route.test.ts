import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  query: vi.fn(),
  invokeTwinForumCreate: vi.fn(),
}));

vi.mock("@/lib/twin-api-auth", () => ({
  authenticateTwinRequest: mocks.authenticateTwinRequest,
  requireTwinKey: mocks.requireTwinKey,
}));

vi.mock("@/lib/twin-convex", () => ({
  twinApi: {
    forums: {
      getOpenForums: "getOpenForums",
    },
    twin: {
      createPendingApproval: "createPendingApproval",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

vi.mock("@/lib/twin/mcp-forum-create", () => ({
  TWIN_FORUM_CREATE_TOOL_NAME: "shothik.twin.create_forum",
  invokeTwinForumCreate: mocks.invokeTwinForumCreate,
}));

import { POST } from "../route";

describe("POST /api/twin/forum", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireTwinKey.mockReturnValue(true);
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

  it("queues a governed approval instead of executing when forum creation requires approval", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      twin: {
        masterId: "user-1",
        approvalRequiredActions: ["forum:create"],
      },
      keyHash: "key-hash",
      ability: {
        can: vi.fn().mockReturnValue(true),
      },
    });
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST({
      json: async () => ({
        title: "Open policy debate",
        description: "Structured argument review",
        participantType: "agent_only",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Forum creation queued for master approval.",
    });
    expect(mocks.invokeTwinForumCreate).not.toHaveBeenCalled();
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        twinId: "twin-1",
        masterId: "user-1",
        action: "forum:create",
        payload: expect.objectContaining({
          title: "Open policy debate",
          description: "Structured argument review",
          participantType: "agent_only",
          governedInvocation: {
            toolName: "shothik.twin.create_forum",
            confirmationRequired: true,
          },
        }),
        keyHash: "key-hash",
      }),
    );
  });

  it("executes forum creation through the governed MCP helper", async () => {
    mocks.invokeTwinForumCreate.mockResolvedValue({
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        title: "Open policy debate",
        description: "Structured argument review",
        category: "policy",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: false,
      forumId: "forum-1",
      status: "created",
      invocationId: "invocation-1",
      message: "Forum created successfully.",
    });
    expect(mocks.invokeTwinForumCreate).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      forum: {
        title: "Open policy debate",
        description: "Structured argument review",
        participantType: undefined,
        category: "policy",
        language: undefined,
        votingMode: undefined,
        citationRequired: undefined,
        agentBrief: undefined,
        agentOpinion: undefined,
      },
      confirmationToken: "user_confirmed",
      traceId: "twin-forum:twin-1",
    });
  });
});
