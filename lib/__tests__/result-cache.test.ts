import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearAllCaches,
  computeContentHash,
  getCachedResult,
  getCacheStats,
  setCachedResult,
} from '../result-cache';

describe('result-cache', () => {
  beforeEach(() => {
    clearAllCaches();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes a stable SHA-256 hash when WebCrypto is available', async () => {
    const a = await computeContentHash('hello', 1, true, undefined, null);
    const b = await computeContentHash('hello', 1, true, undefined, null);

    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falls back to a deterministic non-crypto hash when WebCrypto is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);

    try {
      const a = await computeContentHash('hello', 1, true, undefined, null);
      const b = await computeContentHash('hello', 1, true, undefined, null);
      const c = await computeContentHash('hello', 2, true, undefined, null);

      expect(a).toBe(b);
      expect(a).not.toBe(c);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('returns stale entries after TTL and expires them after stale TTL', () => {
    setCachedResult('ai_detector', 'h1', { ok: 1 });

    const hit = getCachedResult<{ ok: number }>('ai_detector', 'h1');
    expect(hit).toEqual({ data: { ok: 1 }, stale: false });

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    const staleHit = getCachedResult<{ ok: number }>('ai_detector', 'h1');
    expect(staleHit).toEqual({ data: { ok: 1 }, stale: true });

    vi.advanceTimersByTime(48 * 60 * 60 * 1000);
    const miss = getCachedResult<{ ok: number }>('ai_detector', 'h1');
    expect(miss).toBeNull();
  });

  it('evicts least-recently-used entries when at capacity', () => {
    setCachedResult('ai_cowriter', 'seed', { ok: true });
    const { maxEntries } = getCacheStats().ai_cowriter;

    for (let i = 0; i < maxEntries - 1; i++) {
      setCachedResult('ai_cowriter', `k-${i}`, { i });
    }

    setCachedResult('ai_cowriter', 'overflow', { ok: 'overflow' });

    const evicted = getCachedResult<{ ok: boolean }>('ai_cowriter', 'seed');
    expect(evicted).not.toBeNull();
    expect(evicted?.stale).toBe(true);
  });
});
