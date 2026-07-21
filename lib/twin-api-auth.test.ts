import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCreateInsforgeRequestClient,
  mockNormalizeInsforgeUser,
  mockIsAgentKey,
  mockHashAgentKey,
  mockGetTwinByMasterId,
  mockGetTwinByKeyHash,
  mockGetTwinProfileByKeyHash,
} = vi.hoisted(() => ({
  mockCreateInsforgeRequestClient: vi.fn(),
  mockNormalizeInsforgeUser: vi.fn(),
  mockIsAgentKey: vi.fn(),
  mockHashAgentKey: vi.fn(),
  mockGetTwinByMasterId: vi.fn(),
  mockGetTwinByKeyHash: vi.fn(),
  mockGetTwinProfileByKeyHash: vi.fn(),
}));

vi.mock("@/lib/insforge/request", () => ({
  createInsforgeRequestClient: mockCreateInsforgeRequestClient,
}));

vi.mock("@/lib/insforge/user", () => ({
  normalizeInsforgeUser: mockNormalizeInsforgeUser,
}));

vi.mock("./agent-auth", () => ({
  isAgentKey: mockIsAgentKey,
  hashAgentKey: mockHashAgentKey,
}));

vi.mock("@/lib/twin/insforge-twin-service", () => ({
  getTwinByMasterId: mockGetTwinByMasterId,
  getTwinByKeyHash: mockGetTwinByKeyHash,
  getTwinProfileByKeyHash: mockGetTwinProfileByKeyHash,
}));

import { authenticateTwinRequest } from "./twin-api-auth";

describe("twin-api-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInsforgeRequestClient.mockReturnValue({
      auth: {
        getCurrentUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "user@example.com",
              metadata: {},
            },
          },
          error: null,
        }),
      },
    });
    mockNormalizeInsforgeUser.mockReturnValue({
      id: "user-1",
      email: "user@example.com",
      name: "User One",
    });
    mockIsAgentKey.mockReturnValue(true);
    mockHashAgentKey.mockReturnValue("hash-1");
  });

  it("authenticates a session-backed request and loads the twin profile", async () => {
    mockGetTwinByMasterId.mockResolvedValue({
      _id: "twin-1",
      masterId: "user-1",
      name: "Twin One",
      sourcePlatform: "web",
      trainingStatus: "trained",
      knowledgeScore: 90,
      isActive: true,
      taskCount: 4,
      lifecycleState: "verified",
      verificationBadge: true,
      trustScore: 80,
      publishedCount: 2,
      followersCount: 10,
      allowedSkills: ["book:write"],
      blockedSkills: [],
      approvalRequiredActions: ["book:publish"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const auth = await authenticateTwinRequest(
      new NextRequest("http://localhost:3000/api/twin/profile"),
    );

    expect(auth.authenticated).toBe(true);
    expect(auth.authType).toBe("user_session");
    expect(auth.userId).toBe("user-1");
    expect(auth.twin?._id).toBe("twin-1");
    expect(auth.ability?.can("write", "book")).toBe(true);
  });

  it("authenticates a twin-key request through the InsForge twin service", async () => {
    mockGetTwinByKeyHash.mockResolvedValue({
      id: "twin-1",
      masterId: "legacy-user-1",
      masterAuthUserId: "user-1",
      name: "Twin One",
      lifecycleState: "verified",
      allowedSkills: ["forum:post"],
      blockedSkills: [],
      approvalRequiredActions: [],
    });
    mockGetTwinProfileByKeyHash.mockResolvedValue({
      _id: "twin-1",
      masterId: "legacy-user-1",
      name: "Twin One",
      sourcePlatform: "web",
      trainingStatus: "trained",
      knowledgeScore: 90,
      isActive: true,
      taskCount: 4,
      lifecycleState: "verified",
      verificationBadge: true,
      trustScore: 80,
      publishedCount: 2,
      followersCount: 10,
      allowedSkills: ["forum:post"],
      blockedSkills: [],
      approvalRequiredActions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const auth = await authenticateTwinRequest(
      new NextRequest("http://localhost:3000/api/twin/profile", {
        headers: {
          authorization: "Bearer shothik_agent_123_secret",
        },
      }),
    );

    expect(auth.authenticated).toBe(true);
    expect(auth.authType).toBe("twin_key");
    expect(auth.userId).toBe("user-1");
    expect(auth.twinId).toBe("twin-1");
    expect(auth.keyHash).toBe("hash-1");
  });
});
