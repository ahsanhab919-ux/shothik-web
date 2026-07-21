import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockInsforgeQuery } = vi.hoisted(() => ({
  mockInsforgeQuery: vi.fn(),
}));

vi.mock("@/lib/insforge-db", () => ({
  insforgeQuery: mockInsforgeQuery,
  withInsforgeTransaction: vi.fn(),
}));

import {
  createPersistedConversation,
  listConversationsForUser,
} from "@/lib/chat/server";

describe("chat server native ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists conversations by auth_user_id", async () => {
    mockInsforgeQuery.mockResolvedValue({
      rows: [
        {
          id: "conv-1",
          auth_user_id: "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
          legacy_user_id: null,
          surface: "flagship",
          title: "Chat",
          status: "active",
          pinned: false,
          temporary: false,
          model_handle: null,
          context_ref: null,
          last_message_at: new Date("2026-07-14T00:00:00.000Z"),
          last_message_preview: "Hi",
          message_count: 1,
          created_at: new Date("2026-07-14T00:00:00.000Z"),
          updated_at: new Date("2026-07-14T00:00:00.000Z"),
        },
      ],
    });

    const data = await listConversationsForUser({
      userId: "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
      surface: "flagship",
      limit: 10,
    });

    expect(mockInsforgeQuery).toHaveBeenCalledWith(
      expect.stringContaining("auth_user_id = $1::uuid"),
      [
        "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
        "flagship",
        10,
      ],
    );
    expect(data[0].userId).toBe("6f77094c-b5d0-4f13-9ec7-b5947cabf669");
  });

  it("creates conversations with auth_user_id as the canonical owner", async () => {
    mockInsforgeQuery.mockResolvedValue({
      rows: [
        {
          id: "conv-2",
          auth_user_id: "93b81112-7bc7-4c56-92da-d4715ed1771d",
          legacy_user_id: null,
          surface: "flagship",
          title: "New chat",
          status: "active",
          pinned: false,
          temporary: false,
          model_handle: null,
          context_ref: null,
          last_message_at: new Date("2026-07-14T00:00:00.000Z"),
          last_message_preview: null,
          message_count: 0,
          created_at: new Date("2026-07-14T00:00:00.000Z"),
          updated_at: new Date("2026-07-14T00:00:00.000Z"),
        },
      ],
    });

    const data = await createPersistedConversation({
      userId: "93b81112-7bc7-4c56-92da-d4715ed1771d",
      surface: "flagship",
      title: "New chat",
    });

    expect(mockInsforgeQuery).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.chat_conversations"),
      [
        "93b81112-7bc7-4c56-92da-d4715ed1771d",
        "flagship",
        "New chat",
        null,
        false,
        null,
      ],
    );
    expect(String(mockInsforgeQuery.mock.calls[0]?.[0])).toContain("auth_user_id");
    expect(data.userId).toBe("93b81112-7bc7-4c56-92da-d4715ed1771d");
  });

  it("falls back to legacy user_id ownership when auth_user_id is unavailable", async () => {
    mockInsforgeQuery
      .mockRejectedValueOnce({
        code: "42703",
        message: 'column "auth_user_id" does not exist',
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "conv-legacy-schema",
            auth_user_id: "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
            legacy_user_id: null,
            surface: "flagship",
            title: "Legacy schema chat",
            status: "active",
            pinned: false,
            temporary: false,
            model_handle: null,
            context_ref: null,
            last_message_at: new Date("2026-07-14T00:00:00.000Z"),
            last_message_preview: null,
            message_count: 0,
            created_at: new Date("2026-07-14T00:00:00.000Z"),
            updated_at: new Date("2026-07-14T00:00:00.000Z"),
          },
        ],
      });

    const data = await listConversationsForUser({
      userId: "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
      limit: 5,
    });

    expect(mockInsforgeQuery).toHaveBeenCalledTimes(2);
    expect(String(mockInsforgeQuery.mock.calls[1]?.[0])).toContain("user_id = $1::text");
    expect(data[0].userId).toBe("6f77094c-b5d0-4f13-9ec7-b5947cabf669");
  });

  it("falls back to the preserved legacy owner value only when auth_user_id is absent", async () => {
    mockInsforgeQuery.mockResolvedValue({
      rows: [
        {
          id: "conv-legacy",
          auth_user_id: null,
          legacy_user_id: "legacy-user-42",
          surface: "flagship",
          title: "Legacy chat",
          status: "active",
          pinned: false,
          temporary: false,
          model_handle: null,
          context_ref: null,
          last_message_at: new Date("2026-07-14T00:00:00.000Z"),
          last_message_preview: null,
          message_count: 0,
          created_at: new Date("2026-07-14T00:00:00.000Z"),
          updated_at: new Date("2026-07-14T00:00:00.000Z"),
        },
      ],
    });

    const data = await listConversationsForUser({
      userId: "6f77094c-b5d0-4f13-9ec7-b5947cabf669",
    });

    expect(data[0].userId).toBe("legacy-user-42");
  });
});
