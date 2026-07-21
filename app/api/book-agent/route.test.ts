import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCompleteForTool } = vi.hoisted(() => ({
  mockCompleteForTool: vi.fn(),
}));

vi.mock("@/lib/llm/gateway", () => ({
  completeForTool: mockCompleteForTool,
}));

import { POST } from "./route";

let ipOctet = 1;

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/book-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `127.0.0.${ipOctet++}`,
    },
    body: JSON.stringify(body),
  });
}

function parseSsePayload(raw: string) {
  return raw
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
}

describe("POST /api/book-agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams a generated plan when the provider succeeds", async () => {
    mockCompleteForTool.mockResolvedValue({
      text: JSON.stringify({
        title: "Generated Title",
        genre: "Book Project",
        logline: "A strong hook.",
        chapters: [{ title: "Opening", synopsis: "Set up the project." }],
        researchNotes: {
          comparables: [],
          themes: ["identity"],
          settingNotes: "",
          characterArchetypes: [],
          keyConflicts: [],
        },
      }),
    });

    const response = await POST(
      createRequest({
        description: "A book about resilience.",
        type: "book",
        sources: [],
      }),
      {} as never,
    );
    const events = parseSsePayload(await response.text());
    const doneEvent = events.find((event) => event.type === "done");

    expect(response.status).toBe(200);
    expect(doneEvent.plan.title).toBe("Generated Title");
    expect(doneEvent.plan.chapters).toHaveLength(1);
  });

  it("falls back to a local plan when providers are unavailable", async () => {
    mockCompleteForTool.mockRejectedValue(
      new Error("OPENROUTER_API_KEY not configured"),
    );

    const response = await POST(
      createRequest({
        description: "Explore ethical AI adoption in public services.",
        type: "research",
        sources: [{ title: "Policy brief" }],
      }),
      {} as never,
    );
    const events = parseSsePayload(await response.text());
    const doneEvent = events.find((event) => event.type === "done");

    expect(response.status).toBe(200);
    expect(doneEvent.plan.title).toContain("Draft Plan:");
    expect(doneEvent.plan.genre).toBe("Research Paper");
    expect(doneEvent.plan.chapters.length).toBeGreaterThanOrEqual(5);
    expect(doneEvent.plan.researchNotes.comparables).toContain("Policy brief");
  });
});
