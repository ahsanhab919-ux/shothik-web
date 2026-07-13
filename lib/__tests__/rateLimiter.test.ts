import { createHash } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/infrastructure/redis', () => ({
  redisIncr: vi.fn(),
  isRedisAvailable: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  default: { warn: vi.fn() },
}));

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('enforces maxRequests and resets after the window in memory mode', async () => {
    vi.resetModules();
    const { isRedisAvailable } = await import('@/lib/infrastructure/redis');
    (isRedisAvailable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { checkRateLimit } = await import('@/lib/rateLimiter');

    const config = { windowMs: 1000, maxRequests: 2 };

    await expect(checkRateLimit('user:1', config)).resolves.toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 1000,
    });
    await expect(checkRateLimit('user:1', config)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 1000,
    });
    await expect(checkRateLimit('user:1', config)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 1000,
    });

    vi.setSystemTime(new Date(1001));

    await expect(checkRateLimit('user:1', config)).resolves.toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 2001,
    });
  });

  it('falls back to memory when Redis check fails', async () => {
    vi.resetModules();
    const { isRedisAvailable, redisIncr } = await import('@/lib/infrastructure/redis');
    const logger = (await import('@/lib/logger')).default;

    (isRedisAvailable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (redisIncr as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('redis down'));

    const { checkRateLimit } = await import('@/lib/rateLimiter');
    const config = { windowMs: 1000, maxRequests: 1 };

    await expect(checkRateLimit('user:2', config)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 1000,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('getRateLimitKey', () => {
  it('hashes authorization header when present', async () => {
    vi.resetModules();
    const { getRateLimitKey } = await import('@/lib/rateLimiter');

    const auth = 'Bearer test-token';
    const expectedHash = createHash('sha256').update(auth).digest('hex').slice(0, 16);
    const key = getRateLimitKey({ headers: new Headers({ authorization: auth }) }, 'scope');
    expect(key).toBe(`scope:auth:${expectedHash}`);
  });

  it('uses first x-forwarded-for IP when no authorization header', async () => {
    vi.resetModules();
    const { getRateLimitKey } = await import('@/lib/rateLimiter');

    const key = getRateLimitKey(
      { headers: new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }) },
      'scope',
    );
    expect(key).toBe('scope:ip:1.2.3.4');
  });
});

