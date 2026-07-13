import { describe, expect, it } from "vitest";

import { getAuthToken } from "../auth";

describe("getAuthToken", () => {
  it("returns null when Authorization header is missing", () => {
    const req = { headers: new Headers() } as any;
    expect(getAuthToken(req)).toBeNull();
  });

  it("returns null when Authorization header is not Bearer", () => {
    const req = { headers: new Headers({ Authorization: "Basic abc" }) } as any;
    expect(getAuthToken(req)).toBeNull();
  });

  it("returns null when Bearer token is too short", () => {
    const req = { headers: new Headers({ Authorization: "Bearer short" }) } as any;
    expect(getAuthToken(req)).toBeNull();
  });

  it("extracts and trims a valid Bearer token", () => {
    const token = "1234567890abcdef";
    const req = { headers: new Headers({ Authorization: `Bearer   ${token}   ` }) } as any;
    expect(getAuthToken(req)).toBe(token);
  });
});

