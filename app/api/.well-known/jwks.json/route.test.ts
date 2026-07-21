import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("jwks route", () => {
  it("returns retired status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe("Convex JWKS route retired");
  });
});
