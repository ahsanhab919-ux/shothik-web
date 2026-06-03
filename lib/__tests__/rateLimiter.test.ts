import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/infrastructure/redis', () => ({
  redisIncr: vi.fn(),
  isRedisAvailable: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}));

import { redisIncr, isRedisAvailable } from '@/lib/infrastructure/redis';
import logger from '@/lib/logger';
import { checkRateLimit, getRateLimitKey } from '../rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enforces in-memory limits within a time window', async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(false);

    const config = { windowMs: 1000, maxRequests: 2 };

    const first = await checkRateLimit('client-memory', config);
    expect(first).toMatchObject({ allowed: true, remaining: 1 });

    vi.advanceTimersByTime(100);
    const second = await checkRateLimit('client-memory', config);
    expect(second).toMatchObject({ allowed: true, remaining: 0 });

    vi.advanceTimersByTime(100);
    const third = await checkRateLimit('client-memory', config);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.resetAt).toBe(new Date('2026-01-01T00:00:01.000Z').getTime());

    vi.advanceTimersByTime(801);
    const afterWindow = await checkRateLimit('client-memory', config);
    expect(afterWindow.allowed).toBe(true);
  });

  it('uses Redis when available', async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(redisIncr).mockResolvedValue(3);

    const config = { windowMs: 10_000, maxRequests: 2 };
    const result = await checkRateLimit('client-redis', config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(vi.mocked(redisIncr)).toHaveBeenCalledTimes(1);
  });

  it('falls back to memory when Redis check fails', async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(redisIncr).mockRejectedValue(new Error('boom'));

    const result = await checkRateLimit('client-fallback', { windowMs: 1000, maxRequests: 1 });

    expect(result.allowed).toBe(true);
    expect((logger as any).warn).toHaveBeenCalledTimes(1);
  });

  it('builds stable rate limit keys from auth token or IP', () => {
    const authReq = {
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'authorization') return 'Bearer test-token';
          return null;
        },
      },
    };
    const authKey = getRateLimitKey(authReq, 'scope');
    expect(authKey).toMatch(/^scope:auth:[0-9a-f]{16}$/);

    const ipReq = {
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'x-forwarded-for') return '1.2.3.4, 5.6.7.8';
          return null;
        },
      },
    };
    expect(getRateLimitKey(ipReq, 'scope')).toBe('scope:ip:1.2.3.4');
  });
});
