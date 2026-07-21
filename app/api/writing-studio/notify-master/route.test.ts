import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAgentKey,
  mockHashAgentKey,
  mockGetTwinByKeyHash,
  mockCreateTwinNotification,
  mockLoggerWarn,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockIsAgentKey: vi.fn(),
  mockHashAgentKey: vi.fn(),
  mockGetTwinByKeyHash: vi.fn(),
  mockCreateTwinNotification: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("@/lib/agent-auth", () => ({
  isAgentKey: mockIsAgentKey,
  hashAgentKey: mockHashAgentKey,
}));

vi.mock("@/lib/twin/insforge-twin-service", () => ({
  getTwinByKeyHash: mockGetTwinByKeyHash,
  createTwinNotification: mockCreateTwinNotification,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import { POST } from "./route";

describe("notify-master route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAgentKey.mockReturnValue(true);
    mockHashAgentKey.mockReturnValue("hash-1");
    mockGetTwinByKeyHash.mockResolvedValue({
      id: "twin-1",
      masterId: "user-1",
      masterAuthUserId: "user-1",
      masterEmail: "master@example.com",
      name: "Formatting Twin",
      lifecycleState: "verified",
      allowedSkills: [],
      blockedSkills: [],
      approvalRequiredActions: [],
    });
    mockCreateTwinNotification.mockResolvedValue({ _id: "notif-1" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    process.env.RESEND_API_KEY = "re_test_key";
  });

  it("rejects requests without an agent key", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/writing-studio/notify-master", {
        method: "POST",
        body: JSON.stringify({ title: "Draft" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Agent API key required");
  });

  it("rejects unknown agent keys", async () => {
    mockGetTwinByKeyHash.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/writing-studio/notify-master", {
        method: "POST",
        headers: {
          authorization: "Bearer shothik_agent_123_secret",
        },
        body: JSON.stringify({ title: "Draft" }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid agent API key");
  });

  it("creates a twin notification and sends a best-effort email", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/writing-studio/notify-master", {
        method: "POST",
        headers: {
          authorization: "Bearer shothik_agent_123_secret",
        },
        body: JSON.stringify({
          projectId: "project-1",
          title: "My Draft",
          type: "format_complete",
          wordCount: 1200,
          bookId: "book-1",
          bookTitle: "My Draft",
        }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateTwinNotification).toHaveBeenCalledWith({
      masterId: "user-1",
      masterAuthUserId: "user-1",
      twinId: "twin-1",
      twinName: "Formatting Twin",
      type: "format_complete",
      bookId: "book-1",
      bookTitle: "My Draft",
      message: "\"My Draft\" formatting is complete (1,200 words). Ready for your review.",
      feedback: undefined,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(data.success).toBe(true);
    expect(data.notification.stored).toBe(true);
    expect(data.notification.masterId).toBe("user-1");
  });
});
