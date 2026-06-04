import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

function makeReq(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as any;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkDDoSProtection', () => {
  it('blocks when user-agent is missing/too short', async () => {
    vi.resetModules();
    const { checkDDoSProtection } = await import('../ddos-protection');

    const req = makeReq({ 'x-forwarded-for': '1.2.3.4', 'user-agent': '' });
    const result = await checkDDoSProtection(req);

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
  });

  it('challenges bot signature traffic without authorization header', async () => {
    vi.resetModules();
    const { checkDDoSProtection } = await import('../ddos-protection');

    const req = makeReq({
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'sqlmap/1.7.0 automated scanner',
    });
    const result = await checkDDoSProtection(req);

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('challenge');
  });

  it('blocks burst traffic once threshold is exceeded', async () => {
    vi.resetModules();
    const { checkDDoSProtection } = await import('../ddos-protection');

    const req = makeReq({
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    });

    let last: any;
    for (let i = 0; i < 21; i++) {
      last = await checkDDoSProtection(req);
      vi.advanceTimersByTime(i % 2 === 0 ? 50 : 200);
    }

    expect(last.allowed).toBe(false);
    expect(last.action).toBe('block');
    expect(last.reason).toBe('Burst attack detected');
  });
});
