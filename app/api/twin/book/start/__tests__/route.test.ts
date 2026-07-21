import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  invokeTwinBookWrite: vi.fn(),
}));

vi.mock("@/lib/twin-api-auth", () => ({
  authenticateTwinRequest: mocks.authenticateTwinRequest,
  requireTwinKey: mocks.requireTwinKey,
}));

vi.mock("@/lib/twin-convex", () => ({
  twinApi: {
    twin: {
      createPendingApproval: "createPendingApproval",
    },
  },
  createTwinClient: mocks.createTwinClient,
}));

vi.mock("@/lib/twin/mcp-book-write", () => ({
  TWIN_BOOK_WRITE_TOOL_NAME: "shothik.twin.execute_book_write",
  invokeTwinBookWrite: mocks.invokeTwinBookWrite,
}));

import { POST } from "../route";

describe("POST /api/twin/book/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireTwinKey.mockReturnValue(true);
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

  it("queues governed approval when book start requires approval", async () => {
    mocks.authenticateTwinRequest.mockResolvedValue({
      authenticated: true,
      authType: "twin_key",
      userId: "user-1",
      twinId: "twin-1",
      twin: {
        masterId: "user-1",
        approvalRequiredActions: ["book:write"],
      },
      keyHash: "key-hash",
      ability: {
        can: vi.fn().mockReturnValue(true),
      },
    });
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST({
      json: async () => ({
        title: "Governed Draft",
        description: "Book description",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Book creation queued for master approval.",
    });
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        action: "book:write",
        payload: expect.objectContaining({
          operation: "start",
          title: "Governed Draft",
          description: "Book description",
          governedInvocation: {
            toolName: "shothik.twin.execute_book_write",
            confirmationRequired: true,
          },
        }),
      }),
    );
  });

  it("executes book start through the governed MCP helper", async () => {
    mocks.invokeTwinBookWrite.mockResolvedValue({
      operation: "start",
      bookId: "book-1",
      status: "created",
      previousState: null,
      newState: "draft",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        title: "Governed Draft",
        language: "en",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: false,
      bookId: "book-1",
      status: "created",
      invocationId: "invocation-1",
      message: "Book draft created. Proceed with content upload.",
      nextStep: "POST /api/twin/book/upload with your content",
    });
    expect(mocks.invokeTwinBookWrite).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookWrite: {
        operation: "start",
        title: "Governed Draft",
        description: undefined,
        category: undefined,
        language: "en",
      },
      confirmationToken: "user_confirmed",
      traceId: "twin-book-write:twin-1:start",
    });
  });
});
