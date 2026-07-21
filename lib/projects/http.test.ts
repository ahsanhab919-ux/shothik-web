import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

import { handleProjectRouteError } from "@/lib/projects/http";

describe("handleProjectRouteError", () => {
  it("maps missing public.projects schema errors to a 503 backend-unavailable response", async () => {
    const response = handleProjectRouteError(
      {
        code: "42P01",
        message: 'relation "public.projects" does not exist',
      },
      "Failed to list projects.",
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({
      error: "PROJECT_BACKEND_UNAVAILABLE",
      message:
        "Project storage is temporarily unavailable. Verify DATABASE_URL matches the active InsForge project schema.",
    });
  });

  it("keeps unknown errors as generic internal failures", async () => {
    const response = handleProjectRouteError(
      new Error("Unexpected failure"),
      "Failed to list projects.",
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "INTERNAL_ERROR",
      message: "Failed to list projects.",
    });
  });
});
