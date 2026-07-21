import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { completeForTool, FALLBACK_CHAIN, TOOL_ROUTING } from '@/lib/llm/gateway';

const originalEnv = { ...process.env };

describe('LLM gateway', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENROUTER_API_KEY = 'openrouter-test-key';
    delete process.env.OPENROUTER_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.KIMI_API_KEY;
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('routes all current tool traffic to OpenRouter first', () => {
    expect(new Set(Object.values(TOOL_ROUTING))).toEqual(new Set(['openrouter']));
    expect(FALLBACK_CHAIN.openrouter).toEqual(['openrouter', 'gemini', 'deepseek', 'kimi']);
  });

  it('uses the default OpenRouter model when none is configured', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'rewritten text' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    } as Response);

    const response = await completeForTool('paraphrase', {
      prompt: 'Rewrite this text',
    });

    expect(response.provider).toBe('openrouter');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer openrouter-test-key',
        }),
        body: expect.stringContaining('"model":"google/gemini-2.5-flash"'),
      }),
    );
  });

  it('uses OPENROUTER_MODEL when provided', async () => {
    process.env.OPENROUTER_MODEL = 'openai/gpt-4o-mini';
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'summary text' } }],
        usage: { prompt_tokens: 8, completion_tokens: 4 },
      }),
    } as Response);

    await completeForTool('summarize', {
      prompt: 'Summarize this article',
      jsonMode: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('"model":"openai/gpt-4o-mini"'),
      }),
    );
  });

  it('falls back from OpenRouter to Gemini when OpenRouter fails', async () => {
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'upstream unavailable',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'fallback response' }] } }],
          usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 },
        }),
      } as Response);

    const response = await completeForTool('humanize', {
      prompt: 'Make this sound natural',
    });

    expect(response.provider).toBe('gemini');
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2);
  });
});
