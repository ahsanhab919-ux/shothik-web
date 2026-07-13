import { describe, it, expect } from 'vitest';

import SSEDataParser from '../SSEDataParser';

describe('SSEDataParser', () => {
  it('groups keyword research results by worker index and emits only after summary', () => {
    const parser = new SSEDataParser();

    const init = parser.parseEvent({
      author: 'KeywordResearchAgent',
      text: '```json\n{"keywords":["alpha","beta"]}\n```',
    });

    expect(init).toMatchObject({
      type: 'log',
      log: {
        agent: 'KeywordResearchAgent',
        phase: 'research',
        display: 'list',
      },
    });

    expect(
      parser.parseEvent({
        author: 'browser_worker_0',
        url: 'https://example.com/a',
        domain: 'example.com',
      }),
    ).toBeNull();

    expect(
      parser.parseEvent({
        author: 'browser_worker_0',
        url: 'https://example.com/b',
        domain: 'example.com',
      }),
    ).toBeNull();

    const emitted = parser.parseEvent({
      author: 'browser_worker_0',
      summary: 'summary',
    });

    expect(emitted).toMatchObject({
      type: 'log',
      log: {
        agent: 'browser_worker_0',
        phase: 'research',
        display: 'research',
        content: {
          keyword: 'alpha',
          summary: 'summary',
          totalSources: 2,
        },
      },
    });

    const links = (emitted as any).log.content.links;
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ url: 'https://example.com/a', domain: 'example.com' });
  });

  it('emits a slide only when both thinking and html_content are received', () => {
    const parser = new SSEDataParser();

    expect(
      parser.parseEvent({
        author: 'enhanced_slide_generator_1',
        thinking: 'thinking',
      }),
    ).toBeNull();

    const slide = parser.parseEvent({
      author: 'enhanced_slide_generator_1',
      html_content: '<div>slide</div>',
    });

    expect(slide).toEqual({
      type: 'slide',
      slide: {
        slideNumber: 1,
        thinking: 'thinking',
        html_content: '<div>slide</div>',
        timestamp: (slide as any).slide.timestamp,
      },
    });
  });

  it('flushes incomplete slides and searches and clears state', () => {
    const parser = new SSEDataParser();

    parser.parseEvent({
      author: 'KeywordResearchAgent',
      text: '{"keywords":["alpha"]}',
    });

    parser.parseEvent({
      author: 'browser_worker_0',
      url: 'https://example.com/a',
      domain: 'example.com',
    });

    parser.parseEvent({
      author: 'enhanced_slide_generator_2',
      thinking: 'thinking',
    });

    const flushed = parser.flushPending();

    expect(flushed).toHaveLength(2);
    expect(flushed[0]).toMatchObject({
      type: 'log',
      log: {
        content: { keyword: 'alpha', incomplete: true, totalSources: 1 },
      },
    });
    expect(flushed[1]).toMatchObject({
      type: 'slide',
      slide: {
        slideNumber: 2,
        incomplete: true,
      },
    });

    expect(parser.flushPending()).toHaveLength(0);
  });

  it('ignores duplicate event ids', () => {
    const parser = new SSEDataParser();

    const first = parser.parseEvent({
      id: 'evt_1',
      author: 'unknown',
      text: 'hello',
    });
    const second = parser.parseEvent({
      id: 'evt_1',
      author: 'unknown',
      text: 'hello',
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});

