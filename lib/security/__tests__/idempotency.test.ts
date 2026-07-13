import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

let mockRedis: { get: ReturnType<typeof vi.fn>; setex: ReturnType<typeof vi.fn> };

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => mockRedis),
  },
}));

function makeRes() {
  const res: any = {};
  res.setHeader = vi.fn();
  res.status = vi.fn(function (this: any, code: number) {
    this.statusCode = code;
    return this;
  });
  res.json = vi.fn(function (this: any, body: unknown) {
    this.jsonBody = body;
    return this;
  });
  return res;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  mockRedis = { get: vi.fn(), setex: vi.fn() };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('withIdempotency', () => {
  it('replays completed response without calling handler', async () => {
    vi.resetModules();
    mockRedis.get.mockResolvedValueOnce({
      status: 'completed',
      response: { ok: true },
      createdAt: 1,
      expiresAt: 2,
    });

    const { withIdempotency } = await import('../idempotency');

    const handler = vi.fn(async () => {});
    const middleware = withIdempotency(handler, { resource: 'payments' });

    const req = {
      headers: { 'idempotency-key': 'a'.repeat(16) },
      user: { id: 'user_1' },
    };
    const res = makeRes();

    await middleware(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotency-Replay', 'true');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('stores response when handler completes and calls res.json', async () => {
    vi.resetModules();
    mockRedis.get.mockResolvedValue(null);

    const { withIdempotency } = await import('../idempotency');

    const handler = vi.fn(async (_req: any, res: any) => {
      res.status(201).json({ created: true });
    });
    const middleware = withIdempotency(handler, { resource: 'payments', ttl: 60 });

    const req = {
      headers: { 'idempotency-key': 'b'.repeat(16) },
      user: { id: 'user_1' },
    };
    const res = makeRes();

    await middleware(req, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockRedis.setex).toHaveBeenCalled();

    const calls = mockRedis.setex.mock.calls;
    expect(
      calls.some(([, , record]: any[]) => record?.status === 'pending')
    ).toBe(true);
    expect(
      calls.some(([, , record]: any[]) => record?.status === 'completed' && record?.response?.created === true)
    ).toBe(true);
  });

  it('returns 401 when idempotency key is present but user is missing', async () => {
    vi.resetModules();
    const { withIdempotency } = await import('../idempotency');

    const handler = vi.fn(async () => {});
    const middleware = withIdempotency(handler, { resource: 'payments' });

    const req = {
      headers: { 'idempotency-key': 'c'.repeat(16) },
    };
    const res = makeRes();

    await middleware(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });
});

