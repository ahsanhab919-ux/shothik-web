import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  needsApproval: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  invokeTwinBookPublish: vi.fn(),
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

vi.mock("@/lib/twin/mcp-book-publish", () => ({
  TWIN_BOOK_PUBLISH_TOOL_NAME: "shothik.twin.publish_book",
  invokeTwinBookPublish: mocks.invokeTwinBookPublish,
}));

import { POST } from "../route";

describe("POST /api/twin/book/publish", () => {
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

  it("queues governed approval when book publish requires approval", async () => {
    mocks.needsApproval.mockReturnValue(true);
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Book publishing queued for master approval.",
    });
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        action: "book:publish",
        payload: {
          bookId: "book-1",
          governedInvocation: {
            toolName: "shothik.twin.publish_book",
            confirmationRequired: true,
          },
        },
      }),
    );
  });

  it("executes book publish through the governed MCP helper", async () => {
    mocks.invokeTwinBookPublish.mockResolvedValue({
      bookId: "book-1",
      status: "published",
      previousState: "approved",
      newState: "published",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: false,
      bookId: "book-1",
      status: "published",
      previousState: "approved",
      newState: "published",
      invocationId: "invocation-1",
      message: "Book published successfully.",
    });
    expect(mocks.invokeTwinBookPublish).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookId: "book-1",
      confirmationToken: "user_confirmed",
      traceId: "twin-book-publish:twin-1:book-1",
    });
  });
});
