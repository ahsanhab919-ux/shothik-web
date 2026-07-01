import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkDDoSProtection, blockIP, unblockIP } from "../ddos-protection";
import { NextRequest } from "next/server";

describe("DDoS Protection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createMockRequest(ip: string, userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)") {
    const headers = new Headers();
    headers.set("x-forwarded-for", ip);
    headers.set("user-agent", userAgent);

    return {
      headers,
    } as unknown as NextRequest;
  }

  it("allows normal traffic", async () => {
    const req = createMockRequest("192.168.1.1");
    const result = await checkDDoSProtection(req);
    
    expect(result.allowed).toBe(true);
    expect(result.action).toBe("allow");
  });

  it("blocks requests without user-agent", async () => {
    const req = createMockRequest("192.168.1.2", "");
    const result = await checkDDoSProtection(req);
    
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("block");
    expect(result.reason).toBe("Invalid client");
  });

  it("challenges requests with known bot signatures", async () => {
    const req = createMockRequest("192.168.1.3", "sqlmap/1.5.8");
    const result = await checkDDoSProtection(req);
    
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("challenge");
    expect(result.reason).toBe("Automated traffic detected");
  });

  it("detects automated patterns with low variance", async () => {
    const ip = "192.168.1.4";
    const req = createMockRequest(ip);
    
    // Simulate 10 requests with exactly 50ms intervals
    for (let i = 0; i < 10; i++) {
      const result = await checkDDoSProtection(req);
      if (i === 9) {
        expect(result.allowed).toBe(false);
        expect(result.action).toBe("block");
        expect(result.reason).toBe("Automated pattern detected");
      } else {
        expect(result.allowed).toBe(true);
      }
      vi.advanceTimersByTime(50);
    }
  });

  it("detects burst attacks", async () => {
    const ip = "192.168.1.5";
    const req = createMockRequest(ip);
    
    // BURST_THRESHOLD is 20
    for (let i = 0; i <= 20; i++) {
      const result = await checkDDoSProtection(req);
      if (i === 20) {
        expect(result.allowed).toBe(false);
        expect(result.action).toBe("block");
        expect(result.reason).toBe("Burst attack detected");
      } else {
        expect(result.allowed).toBe(true);
      }
      // Vary the time to avoid automated pattern detection (variance < 100)
      vi.advanceTimersByTime(i % 2 === 0 ? 100 : 300);
    }
  });

  it("respects manual IP blocking", async () => {
    const ip = "10.0.0.1";
    await blockIP(ip, 3600, "manual block");
    
    const req = createMockRequest(ip);
    const result = await checkDDoSProtection(req);
    
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("block");
    expect(result.reason).toBe("IP blocked due to suspicious activity");
    
    await unblockIP(ip);
    const unblockedResult = await checkDDoSProtection(req);
    expect(unblockedResult.allowed).toBe(true);
  });
});
