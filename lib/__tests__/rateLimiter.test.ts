import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

vi.mock('@/lib/infrastructure/redis', () => ({
  redisIncr: vi.fn(),
  isRedisAvailable: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRateLimitKey', () => {
    it('hashes authorization header to avoid storing raw tokens', async () => {
      const { getRateLimitKey } = await import('@/lib/rateLimiter');
      const auth = 'Bearer secret-token';
      const expectedHash = createHash('sha256').update(auth).digest('hex').slice(0, 16);

      const req = {
        headers: {
          get: (name: string) => (name.toLowerCase() === 'authorization' ? auth : null),
        },
      };

      expect(getRateLimitKey(req, 'tools')).toBe(`tools:auth:${expectedHash}`);
    });

    it('falls back to x-forwarded-for first hop when authorization is missing', async () => {
      const { getRateLimitKey } = await import('@/lib/rateLimiter');

      const req = {
        headers: {
          get: (name: string) => {
            if (name.toLowerCase() === 'x-forwarded-for') return '1.2.3.4, 5.6.7.8';
            return null;
          },
        },
      };

      expect(getRateLimitKey(req, 'api')).toBe('api:ip:1.2.3.4');
    });
  });

  describe('checkRateLimit', () => {
    it('uses Redis window slotting when Redis is available', async () => {
      const redis = await import('@/lib/infrastructure/redis');
      const redisIncr = vi.mocked(redis.redisIncr);
      const isRedisAvailable = vi.mocked(redis.isRedisAvailable);

      isRedisAvailable.mockReturnValue(true);
      redisIncr.mockResolvedValue(2);

      const { checkRateLimit } = await import('@/lib/rateLimiter');

      const config = { windowMs: 10_000, maxRequests: 3 };
      const now = Date.now();
      const windowSlot = Math.floor(now / config.windowMs);

      const result = await checkRateLimit('user-1', config);

      expect(redisIncr).toHaveBeenCalledWith(`rl:user-1:${windowSlot}`, 10);
      expect(result).toEqual({
        allowed: true,
        remaining: 1,
        resetAt: (windowSlot + 1) * config.windowMs,
      });
    });

    it('falls back to in-memory limiting when Redis check throws', async () => {
      const redis = await import('@/lib/infrastructure/redis');
      const redisIncr = vi.mocked(redis.redisIncr);
      const isRedisAvailable = vi.mocked(redis.isRedisAvailable);

      isRedisAvailable.mockReturnValue(true);
      redisIncr.mockRejectedValue(new Error('redis down'));

      const logger = await import('@/lib/logger');
      const warn = vi.mocked(logger.default.warn);

      const { checkRateLimit } = await import('@/lib/rateLimiter');

      const config = { windowMs: 1_000, maxRequests: 1 };
      const first = await checkRateLimit('fallback-user', config);
      const second = await checkRateLimit('fallback-user', config);

      expect(warn).toHaveBeenCalled();
      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(false);
      expect(second.remaining).toBe(0);
    });

    it('unblocks after window passes for in-memory limiter', async () => {
      const redis = await import('@/lib/infrastructure/redis');
      vi.mocked(redis.isRedisAvailable).mockReturnValue(false);

      const { checkRateLimit } = await import('@/lib/rateLimiter');

      const config = { windowMs: 1_000, maxRequests: 1 };
      const first = await checkRateLimit('mem-user', config);
      const second = await checkRateLimit('mem-user', config);

      vi.setSystemTime(new Date(Date.now() + 1_001));
      const third = await checkRateLimit('mem-user', config);

      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(false);
      expect(third.allowed).toBe(true);
    });
  });
});

