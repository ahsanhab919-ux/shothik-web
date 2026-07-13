import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rateLimiter', () => ({
  checkRateLimit: vi.fn(),
}));

describe('checkTieredToolRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('defaults to free tier and wires identifier/config into checkRateLimit', async () => {
    vi.resetModules();
    const { checkRateLimit } = await import('@/lib/rateLimiter');
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: 3_600_000,
    });

    const { checkTieredToolRateLimit } = await import('@/lib/tool-rate-limiter');
    const result = await checkTieredToolRateLimit('u1', '', 'summarize');

    expect(checkRateLimit).toHaveBeenCalledWith('tool:summarize:u1', {
      windowMs: 3_600_000,
      maxRequests: 10,
    });
    expect(result).toEqual({
      allowed: true,
      limit: 10,
      remaining: 9,
      tier: 'free',
    });
  });

  it('returns a 429 NextResponse with rate-limit headers when not allowed', async () => {
    vi.resetModules();
    const { checkRateLimit } = await import('@/lib/rateLimiter');
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 5_500,
    });

    const { checkTieredToolRateLimit } = await import('@/lib/tool-rate-limiter');
    const result = await checkTieredToolRateLimit('u2', 'pro', 'plagiarism');

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(500);
    expect(result.remaining).toBe(0);
    expect(result.tier).toBe('pro');
    expect(result.response?.status).toBe(429);
    expect(result.response?.headers.get('Retry-After')).toBe('6');
    expect(result.response?.headers.get('X-RateLimit-Limit')).toBe('500');
    expect(result.response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(result.response?.headers.get('X-RateLimit-Reset')).toBe('6');
  });

  it('falls back to free tier for unknown tiers', async () => {
    vi.resetModules();
    const { checkRateLimit } = await import('@/lib/rateLimiter');
    (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 7,
      resetAt: 3_600_000,
    });

    const { checkTieredToolRateLimit } = await import('@/lib/tool-rate-limiter');
    const result = await checkTieredToolRateLimit('u3', 'enterprise', 'grammar');

    expect(checkRateLimit).toHaveBeenCalledWith('tool:grammar:u3', {
      windowMs: 3_600_000,
      maxRequests: 10,
    });
    expect(result).toEqual({
      allowed: true,
      limit: 10,
      remaining: 7,
      tier: 'enterprise',
    });
  });
});

