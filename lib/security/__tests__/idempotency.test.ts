import { describe, expect, it, vi } from "vitest";

const redisStore = new Map<string, unknown>();

vi.mock("@upstash/redis", () => {
  class Redis {
    static fromEnv() {
      return {
        get: async (key: string) => (redisStore.has(key) ? redisStore.get(key) : null),
        setex: async (key: string, _ttl: number, value: unknown) => {
          redisStore.set(key, value);
        },
      };
    }
  }

  return { Redis };
});

async function loadIdempotency() {
  vi.resetModules();
  redisStore.clear();
  process.env.UPSTASH_REDIS_REST_URL = "https://example.com";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  return await import("../idempotency");
}

describe("idempotency", () => {
  it("marks keys as pending once and rejects reuse", async () => {
    const { markIdempotencyPending, checkIdempotency } = await loadIdempotency();

    const first = await markIdempotencyPending("k1", "u1", "resource", 60);
    expect(first).toBe(true);

    const existing = await checkIdempotency("k1", "u1", "resource");
    expect(existing?.status).toBe("pending");

    const second = await markIdempotencyPending("k1", "u1", "resource", 60);
    expect(second).toBe(false);
  });

  it("returns cached responses for completed keys via handleIdempotency", async () => {
    const { handleIdempotency, completeIdempotency } = await loadIdempotency();

    const request1 = new Request("https://example.com/api/test", {
      headers: { "idempotency-key": "k2" },
    });
    (request1 as any).user = { id: "u1" };

    const first = await handleIdempotency(request1, "resource");
    expect(first.shouldProceed).toBe(true);
    expect(first.key).toBe("k2");

    const request2 = new Request("https://example.com/api/test", {
      headers: { "idempotency-key": "k2" },
    });
    (request2 as any).user = { id: "u1" };

    const pending = await handleIdempotency(request2, "resource");
    expect(pending.shouldProceed).toBe(false);
    expect(pending.cachedResponse?.status).toBe(409);

    await completeIdempotency("k2", "u1", "resource", { ok: true });

    const request3 = new Request("https://example.com/api/test", {
      headers: { "idempotency-key": "k2" },
    });
    (request3 as any).user = { id: "u1" };

    const completed = await handleIdempotency(request3, "resource");
    expect(completed.shouldProceed).toBe(false);
    expect(completed.cachedResponse?.status).toBe(200);
    expect(completed.cachedResponse?.headers.get("Idempotency-Replay")).toBe("true");
    expect(await completed.cachedResponse?.json()).toEqual({ ok: true });
  });
});

