import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeReqInit = {
  method?: string;
  headers?: Record<string, string>;
  json?: unknown;
};

function makeReq(url: string, init: FakeReqInit = {}) {
  const parsedUrl = new URL(url);
  return {
    method: init.method ?? "GET",
    url,
    headers: new Headers(init.headers ?? {}),
    nextUrl: parsedUrl,
    json: async () => init.json ?? {},
  } as any;
}

describe("defineRoute", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 401 when auth is required and header is missing", async () => {
    vi.resetModules();
    const { defineRoute, z } = await import("../api-validation");

    const handler = vi.fn(async () => new Response("ok", { status: 200 }));

    const route = defineRoute({
      method: "post",
      path: "/api/test",
      config: { requireAuth: true },
      schemas: { body: z.object({ name: z.string() }) },
      handler,
    });

    const res = await route(
      makeReq("https://example.com/api/test", { method: "POST", json: { name: "Ada" } }),
      { params: {} },
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 400 when idempotency key is required but missing", async () => {
    vi.resetModules();
    const { defineRoute, z } = await import("../api-validation");

    const route = defineRoute({
      method: "post",
      path: "/api/test",
      config: { requireIdempotencyKey: true },
      schemas: { body: z.object({ ok: z.boolean() }) },
      handler: async () => new Response("ok", { status: 200 }),
    });

    const res = await route(
      makeReq("https://example.com/api/test", { method: "POST", json: { ok: true } }),
      { params: {} },
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "MISSING_IDEMPOTENCY_KEY" },
    });
  });

  it("returns 400 with validation error details for invalid request bodies", async () => {
    vi.resetModules();
    const { defineRoute, z } = await import("../api-validation");

    const route = defineRoute({
      method: "post",
      path: "/api/test",
      schemas: { body: z.object({ count: z.number().int().min(1) }) },
      handler: async () => new Response("ok", { status: 200 }),
    });

    const res = await route(
      makeReq("https://example.com/api/test", { method: "POST", json: { count: 0 } }),
      { params: {} },
    );

    const payload = await res.json();
    expect(res.status).toBe(400);
    expect(payload).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(Array.isArray(payload.error.details)).toBe(true);
  });

  it("parses body/query/params, sets request header, and enforces rate limits", async () => {
    vi.resetModules();
    const { defineRoute, z } = await import("../api-validation");

    const handler = vi.fn(
      async ({ body, query, params }: any) =>
        new Response(JSON.stringify({ body, query, params }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const route = defineRoute({
      method: "post",
      path: "/api/test/[id]",
      config: { rateLimit: { requests: 1, windowMs: 60_000 } },
      schemas: {
        body: z.object({ name: z.string() }),
        query: z.object({ q: z.string() }),
        params: z.object({ id: z.string() }),
      },
      handler,
    });

    const first = await route(
      makeReq("https://example.com/api/test/abc?q=hello", {
        method: "POST",
        headers: { "x-forwarded-for": "10.0.0.1" },
        json: { name: "Ada" },
      }),
      { params: { id: "abc" } },
    );

    expect(first.status).toBe(200);
    expect(first.headers.get("X-Request-Id")).toBeTruthy();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: "Ada" },
        query: { q: "hello" },
        params: { id: "abc" },
      }),
    );

    const second = await route(
      makeReq("https://example.com/api/test/abc?q=hello", {
        method: "POST",
        headers: { "x-forwarded-for": "10.0.0.1" },
        json: { name: "Ada" },
      }),
      { params: { id: "abc" } },
    );

    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe("60");
    expect(await second.json()).toMatchObject({
      error: { code: "RATE_LIMIT_EXCEEDED" },
    });
  });
});

