import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateTwinRequest: vi.fn(),
  requireTwinKey: vi.fn(),
  needsApproval: vi.fn(),
  createTwinClient: vi.fn(),
  mutation: vi.fn(),
  invokeTwinBookWrite: vi.fn(),
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

vi.mock("@/lib/twin/mcp-book-write", () => ({
  TWIN_BOOK_WRITE_TOOL_NAME: "shothik.twin.execute_book_write",
  invokeTwinBookWrite: mocks.invokeTwinBookWrite,
}));

import { POST } from "../route";

describe("POST /api/twin/book/upload", () => {
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

  it("queues governed approval when content upload requires approval", async () => {
    mocks.needsApproval.mockReturnValue(true);
    mocks.mutation.mockResolvedValue("approval-1");

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
        content: "Generated content",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      requiresApproval: true,
      approvalId: "approval-1",
      message: "Book content upload queued for master approval.",
    });
    expect(mocks.mutation).toHaveBeenCalledWith(
      "createPendingApproval",
      expect.objectContaining({
        action: "book:write",
        payload: expect.objectContaining({
          operation: "upload",
          bookId: "book-1",
          content: "Generated content",
          governedInvocation: {
            toolName: "shothik.twin.execute_book_write",
            confirmationRequired: true,
          },
        }),
      }),
    );
  });

  it("executes content upload through the governed MCP helper", async () => {
    mocks.invokeTwinBookWrite.mockResolvedValue({
      operation: "upload",
      bookId: "book-1",
      status: "state_advanced",
      previousState: "draft",
      newState: "agent_generated",
      invocationId: "invocation-1",
      connectorId: "shothik-native:user-1",
    });

    const response = await POST({
      json: async () => ({
        bookId: "book-1",
        content: "Generated content",
      }),
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      contentState: "agent_generated",
      previousState: "draft",
      invocationId: "invocation-1",
      message: "Content uploaded. Submit metadata for review: POST /api/twin/book/metadata",
    });
    expect(mocks.invokeTwinBookWrite).toHaveBeenCalledWith({
      tenantId: "user-1",
      userId: "user-1",
      bookWrite: {
        operation: "upload",
        bookId: "book-1",
        content: "Generated content",
      },
      confirmationToken: "user_confirmed",
      traceId: "twin-book-write:twin-1:book-1:upload",
    });
  });
});
