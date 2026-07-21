import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, rmSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";

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

import { POST } from "./route";
import { GET as getStatus } from "./status/[buildId]/route";
import { GET as downloadPdf } from "./download/[buildId]/route";

const STORE_DIR = "/tmp/writing-studio-builds";

let ipOctet = 40;

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/latex", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `127.0.0.${ipOctet++}`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/latex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRenderJob.mockResolvedValue(undefined);
    mockUpdateRenderJob.mockResolvedValue(undefined);
    mockGetRenderJobByBuildId.mockResolvedValue(undefined);
  });

  it("rejects empty HTML payloads", async () => {
    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("HTML is required");
  });

  it("creates a downloadable PDF build in the local fallback path", async () => {
    const response = await POST(
      createRequest({
        html: "<h1>Fallback PDF</h1><p>This is a valid export body.</p>",
        metadata: { title: "Fallback PDF", author: "QA" },
      }),
    );
    const data = await response.json();
    const buildId = data.buildId as string;
    const buildDir = path.join(STORE_DIR, `pdf_${buildId}`);
    const recordPath = path.join(STORE_DIR, `${buildId}.json`);

    expect(response.status).toBe(200);
    expect(data.status).toBe("completed");
    expect(existsSync(path.join(buildDir, "document.pdf"))).toBe(true);

    const statusResponse = await getStatus(
      new NextRequest(`http://localhost:3000/api/latex/status/${buildId}`, {
        headers: { "x-forwarded-for": `127.0.0.${ipOctet++}` },
      }),
      { params: Promise.resolve({ buildId }) },
    );
    const statusData = await statusResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusData.status).toBe("completed");
    expect(statusData.pdfUrl).toBe(`/api/latex/download/${buildId}`);

    const downloadResponse = await downloadPdf(
      new NextRequest(`http://localhost:3000/api/latex/download/${buildId}`, {
        headers: { "x-forwarded-for": `127.0.0.${ipOctet++}` },
      }),
      { params: Promise.resolve({ buildId }) },
    );
    const pdfBuffer = Buffer.from(await downloadResponse.arrayBuffer());

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("Content-Type")).toBe("application/pdf");
    expect(pdfBuffer.subarray(0, 4).toString("utf8")).toBe("%PDF");

    if (existsSync(buildDir)) {
      rmSync(buildDir, { recursive: true, force: true });
    }
    if (existsSync(recordPath)) {
      rmSync(recordPath, { force: true });
    }
  });
});
