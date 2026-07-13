import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIdempotency, storeIdempotency, markIdempotencyPending, generateIdempotencyKey, handleIdempotency } from "../idempotency";
import { Redis } from "@upstash/redis";

const mockGet = vi.fn();
const mockSetex = vi.fn();

vi.mock("@upstash/redis", () => {
  return {
    Redis: {
      fromEnv: () => ({
        get: mockGet,
        setex: mockSetex,
      }),
    },
  };
});

describe("Idempotency", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    
    mockGet.mockReset();
    mockSetex.mockReset();
  });

  it("generates secure idempotency keys", () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    
    expect(key1).not.toBe(key2);
    expect(key1.length).toBe(64); // 32 bytes hex
  });

  it("checks existing idempotency key", async () => {
    mockGet.mockResolvedValueOnce({
      status: "completed",
      response: { success: true },
      createdAt: 123,
      expiresAt: 456
    });

    const result = await checkIdempotency("key123", "user1", "payment");
    expect(result?.status).toBe("completed");
    expect(mockGet).toHaveBeenCalledWith("idempotency:user1:payment:key123");
  });

  it("stores idempotency response", async () => {
    await storeIdempotency("key123", "user1", "payment", { amount: 100 });
    expect(mockSetex).toHaveBeenCalledWith(
      "idempotency:user1:payment:key123",
      86400,
      expect.objectContaining({
        status: "completed",
        response: { amount: 100 }
      })
    );
  });

  it("marks idempotency as pending", async () => {
    mockGet.mockResolvedValueOnce(null); // not exists
    const success = await markIdempotencyPending("key123", "user1", "payment");
    
    expect(success).toBe(true);
    expect(mockSetex).toHaveBeenCalledWith(
      "idempotency:user1:payment:key123",
      3600,
      expect.objectContaining({
        status: "pending"
      })
    );
  });

  it("fails to mark pending if key already exists", async () => {
    mockGet.mockResolvedValueOnce({ status: "pending" }); // exists
    const success = await markIdempotencyPending("key123", "user1", "payment");
    
    expect(success).toBe(false);
    expect(mockSetex).not.toHaveBeenCalled();
  });

  describe("handleIdempotency middleware", () => {
    it("proceeds if no key provided", async () => {
      const req = { headers: new Headers() } as any;
      const result = await handleIdempotency(req, "payment");
      expect(result.shouldProceed).toBe(true);
    });

    it("returns 401 if key provided but no user", async () => {
      const headers = new Headers();
      headers.set("idempotency-key", "key123");
      const req = { headers } as any;
      
      const result = await handleIdempotency(req, "payment");
      expect(result.shouldProceed).toBe(false);
      expect(result.cachedResponse?.status).toBe(401);
    });

    it("returns 409 if request is already in progress", async () => {
      const headers = new Headers();
      headers.set("idempotency-key", "key123");
      const req = { headers, user: { id: "user1" } } as any;
      
      mockGet.mockResolvedValueOnce({ status: "pending" });
      
      const result = await handleIdempotency(req, "payment");
      expect(result.shouldProceed).toBe(false);
      expect(result.cachedResponse?.status).toBe(409);
    });

    it("returns cached response if already completed", async () => {
      const headers = new Headers();
      headers.set("idempotency-key", "key123");
      const req = { headers, user: { id: "user1" } } as any;
      
      mockGet.mockResolvedValueOnce({ status: "completed", response: { data: "success" } });
      
      const result = await handleIdempotency(req, "payment");
      expect(result.shouldProceed).toBe(false);
      expect(result.cachedResponse?.status).toBe(200);
      expect(result.cachedResponse?.headers.get("Idempotency-Replay")).toBe("true");
    });
  });
});
