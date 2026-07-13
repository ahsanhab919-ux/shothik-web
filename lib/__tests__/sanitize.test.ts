import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

describe('sanitizeHtml (lib/sanitize)', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('removes script tags while preserving allowed content', () => {
    const result = sanitizeHtml('<script>alert(1)</script><p>ok</p>');
    expect(result).not.toContain('<script');
    expect(result).toContain('<p>ok</p>');
  });

  it('removes forbidden attributes like inline handlers and style', () => {
    const result = sanitizeHtml(
      '<img src="https://example.com/x.png" onerror="alert(1)" style="color:red" />',
    );
    expect(result).toContain('src="https://example.com/x.png"');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('style=');
  });

  it('blocks javascript: URLs in href', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('allows data attributes for permitted elements', () => {
    const result = sanitizeHtml('<div data-test="1">x</div>');
    expect(result).toContain('data-test="1"');
    expect(result).toContain('>x<');
  });
});

