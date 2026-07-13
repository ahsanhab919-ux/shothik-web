import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@upstash/redis', () => {
  class Redis {
    static fromEnv() {
      return new Redis();
    }

    async get<T>(key: string): Promise<T | null> {
      return (store.get(key) as T | undefined) ?? null;
    }

    async setex<T>(key: string, _ttl: number, value: T): Promise<void> {
      store.set(key, value);
    }
  }

  return { Redis };
});

describe('idempotency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    store.clear();
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates a 64-char hex idempotency key', async () => {
    const { generateIdempotencyKey } = await import('../idempotency');
    const key = generateIdempotencyKey();

    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('prevents reusing an idempotency key when marking pending', async () => {
    const { markIdempotencyPending } = await import('../idempotency');

    const first = await markIdempotencyPending('k'.repeat(16), 'u1', 'res');
    const second = await markIdempotencyPending('k'.repeat(16), 'u1', 'res');

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('replays a completed response and blocks handler execution', async () => {
    const { withIdempotency } = await import('../idempotency');

    const handler = vi.fn(async (_req: any, res: any) => {
      res.status(201).json({ ok: true });
    });

    const wrapped = withIdempotency(handler, { resource: 'charge' });

    const key = 'a'.repeat(16);
    const req1: any = { headers: { 'idempotency-key': key }, user: { id: 'u1' } };

    const res1: any = {
      headers: {} as Record<string, string>,
      statusCode: 200,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };

    await wrapped(req1, res1);
    expect(handler).toHaveBeenCalledTimes(1);

    const req2: any = { headers: { 'idempotency-key': key }, user: { id: 'u1' } };
    const res2: any = {
      headers: {} as Record<string, string>,
      statusCode: 200,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };

    await wrapped(req2, res2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res2.headers['Idempotency-Replay']).toBe('true');
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toEqual({ ok: true });
  });

  it('returns 409 when a request is already pending', async () => {
    const { markIdempotencyPending, withIdempotency } = await import('../idempotency');

    const key = 'b'.repeat(16);
    await markIdempotencyPending(key, 'u1', 'charge');

    const handler = vi.fn(async (_req: any, res: any) => {
      res.status(201).json({ ok: true });
    });

    const wrapped = withIdempotency(handler, { resource: 'charge' });

    const req: any = { headers: { 'idempotency-key': key }, user: { id: 'u1' } };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
      setHeader() {},
    };

    await wrapped(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ error: 'Request already in progress' });
  });

  it('blocks idempotent requests without authentication', async () => {
    const { withIdempotency } = await import('../idempotency');

    const handler = vi.fn(async (_req: any, res: any) => {
      res.status(201).json({ ok: true });
    });

    const wrapped = withIdempotency(handler, { resource: 'charge' });

    const req: any = { headers: { 'idempotency-key': 'c'.repeat(16) } };
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
      setHeader() {},
    };

    await wrapped(req, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('handleIdempotency returns cached responses for completed records', async () => {
    const { handleIdempotency, completeIdempotency } = await import('../idempotency');

    const key = 'd'.repeat(16);
    await completeIdempotency(key, 'u1', 'charge', { ok: true });

    const request = new Request('http://localhost/api/charge', {
      headers: { 'idempotency-key': key },
    });
    (request as any).user = { id: 'u1' };

    const result = await handleIdempotency(request, 'charge');

    expect(result.shouldProceed).toBe(false);
    expect(result.cachedResponse).toBeDefined();
    expect(result.cachedResponse?.status).toBe(200);
    expect(result.cachedResponse?.headers.get('Idempotency-Replay')).toBe('true');
    expect(await result.cachedResponse?.json()).toEqual({ ok: true });
  });
});
