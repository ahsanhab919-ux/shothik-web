import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, rmSync } from "fs";

const {
  mockCreateRenderJob,
  mockUpdateRenderJob,
  mockGetRenderJobByBuildId,
} = vi.hoisted(() => ({
  mockCreateRenderJob: vi.fn(),
  mockUpdateRenderJob: vi.fn(),
  mockGetRenderJobByBuildId: vi.fn(),
}));

vi.mock("@/lib/publishing/insforge-render-service", () => ({
  createRenderJob: mockCreateRenderJob,
  updateRenderJob: mockUpdateRenderJob,
  getRenderJobByBuildId: mockGetRenderJobByBuildId,
}));

import {
  createBuild,
  getBuild,
  getBuildWithPersistenceFallback,
  updateBuild,
} from "./buildStore";

const STORE_FILE = "/tmp/writing-studio-builds/build-unit-1.json";

describe("buildStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRenderJob.mockResolvedValue(undefined);
    mockUpdateRenderJob.mockResolvedValue(undefined);
    mockGetRenderJobByBuildId.mockResolvedValue(undefined);
    if (existsSync(STORE_FILE)) {
      rmSync(STORE_FILE);
    }
  });

  it("creates a local build record and mirrors it to the render service", async () => {
    const build = createBuild(
      "build-unit-1",
      "Sample content",
      { format: "pdf" },
      "user-1",
    );

    expect(build.buildId).toBe("build-unit-1");
    expect(getBuild("build-unit-1")?.status).toBe("queued");
    expect(mockCreateRenderJob).toHaveBeenCalledWith({
      buildId: "build-unit-1",
      userId: "user-1",
      content: "Sample content",
      metadata: { format: "pdf" },
    });
  });

  it("updates a local build and mirrors status changes", async () => {
    createBuild("build-unit-1", "Sample content");

    const updated = updateBuild("build-unit-1", {
      status: "completed",
      pdfUrl: "https://cdn.example.com/build.pdf",
    });

    expect(updated?.status).toBe("completed");
    expect(updated?.pdfUrl).toBe("https://cdn.example.com/build.pdf");
    expect(mockUpdateRenderJob).toHaveBeenCalledWith({
      buildId: "build-unit-1",
      status: "completed",
      pdfUrl: "https://cdn.example.com/build.pdf",
      error: undefined,
    });
  });

  it("falls back to persisted render jobs when the local file is absent", async () => {
    mockGetRenderJobByBuildId.mockResolvedValue({
      buildId: "build-unit-1",
      status: "processing",
      updatedAt: "2026-07-18T12:00:00.000Z",
    });

    const build = await getBuildWithPersistenceFallback("build-unit-1");

    expect(mockGetRenderJobByBuildId).toHaveBeenCalledWith("build-unit-1");
    expect(build?.status).toBe("processing");
  });
});
