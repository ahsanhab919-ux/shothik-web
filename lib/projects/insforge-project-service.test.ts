import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockInsforgeQuery, mockWithInsforgeTransaction } = vi.hoisted(() => ({
  mockInsforgeQuery: vi.fn(),
  mockWithInsforgeTransaction: vi.fn(),
}));

vi.mock("@/lib/insforge-db", () => ({
  insforgeQuery: mockInsforgeQuery,
  withInsforgeTransaction: mockWithInsforgeTransaction,
}));

import {
  InsforgeProjectServiceError,
  createProjectForUser,
  getProjectForUser,
  restoreProjectVersionForUser,
} from "@/lib/projects/insforge-project-service";

function makeProjectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    legacy_convex_id: null,
    auth_user_id: "user-1",
    type: "book",
    title: "Project One",
    template: "novel",
    description: "Draft",
    content: "hello world draft",
    sections: [],
    settings: { tone: "warm" },
    word_count: 3,
    progress: 15,
    starred: false,
    last_edited_at: "2026-07-17T00:00:00.000Z",
    created_at: "2026-07-16T00:00:00.000Z",
    updated_at: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "version-1",
    project_id: "project-1",
    auth_user_id: "user-1",
    content: "restored version body",
    sections: [{ heading: "Chapter 1" }],
    label: "Draft v1",
    saved_at: "2026-07-17T00:00:00.000Z",
    created_at: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("insforge project service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates projects with normalized title and derived word count", async () => {
    mockInsforgeQuery.mockResolvedValue({
      rows: [makeProjectRow({ title: "My Draft", content: "one two three four", word_count: 4 })],
    });

    const project = await createProjectForUser({
      userId: "user-1",
      title: "  My Draft  ",
      type: "book",
      content: "one two three four",
      sections: [{ id: "intro" }],
      settings: { tone: "bold" },
    });

    expect(mockInsforgeQuery).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.projects"),
      [
        "user-1",
        "book",
        "My Draft",
        null,
        null,
        "one two three four",
        JSON.stringify([{ id: "intro" }]),
        JSON.stringify({ tone: "bold" }),
        4,
        0,
        null,
        null,
      ],
    );
    expect(project).toMatchObject({
      _id: "project-1",
      title: "My Draft",
      wordCount: 4,
    });
  });

  it("rejects access to projects owned by another user", async () => {
    mockInsforgeQuery.mockResolvedValue({
      rows: [makeProjectRow({ auth_user_id: "different-user" })],
    });

    await expect(getProjectForUser("project-1", "user-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<InsforgeProjectServiceError>);
  });

  it("restores a version and appends a restore snapshot inside one transaction", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [makeProjectRow()] })
        .mockResolvedValueOnce({ rows: [makeVersionRow()] })
        .mockResolvedValueOnce({
          rows: [
            makeProjectRow({
              content: "restored version body",
              sections: [{ heading: "Chapter 1" }],
              word_count: 3,
            }),
          ],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    mockWithInsforgeTransaction.mockImplementation(async (callback) => callback(mockClient));

    const project = await restoreProjectVersionForUser("project-1", "version-1", "user-1");

    expect(mockWithInsforgeTransaction).toHaveBeenCalledTimes(1);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from public.project_versions"),
      ["version-1", "project-1", "user-1"],
    );
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("insert into public.project_versions"),
      [
        "project-1",
        "user-1",
        "restored version body",
        JSON.stringify([{ heading: "Chapter 1" }]),
        "Restored Draft v1",
      ],
    );
    expect(project).toMatchObject({
      _id: "project-1",
      content: "restored version body",
      wordCount: 3,
    });
  });
});
