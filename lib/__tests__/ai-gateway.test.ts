import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeWithGateway,
  GatewayError,
  getCircuitStatus,
  resetCircuit,
} from '../ai-gateway';

describe('ai-gateway', () => {
  beforeEach(() => {
    resetCircuit('plagiarism');
  });

  it('wraps a successful call and reports gateway metadata', async () => {
    const result = await executeWithGateway(async () => 'ok', {
      tool: 'plagiarism',
    });

    expect(result).toMatchObject({
      data: 'ok',
      fromCache: false,
      retried: false,
      circuitState: 'closed',
    });
    expect(typeof result.latencyMs).toBe('number');
  });

  it('converts status-bearing errors into a retriable GatewayError when appropriate', async () => {
    try {
      await executeWithGateway(
        async () => {
          throw Object.assign(new Error('rate limited'), { status: 429 });
        },
        { tool: 'plagiarism' },
      );
      throw new Error('Expected executeWithGateway to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect(err).toMatchObject({
        status: 429,
        tool: 'plagiarism',
        retriable: true,
      });
    }
  });

  it('tracks per-tool failure counts', async () => {
    await expect(
      executeWithGateway(
        async () => {
          throw Object.assign(new Error('boom'), { status: 500 });
        },
        { tool: 'plagiarism' },
      ),
    ).rejects.toBeInstanceOf(GatewayError);

    const status = getCircuitStatus('plagiarism');
    expect(status.failureCount).toBeGreaterThanOrEqual(1);
  });
});
