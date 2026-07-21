/**
 * Test setup file
 * Runs before each test file
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as React from 'react';

// Next 15/16 + React 19 test environment hack
// Forces vitest/jsdom to properly resolve React hooks instead of
// failing with "Invalid hook call" when running multiple test files
globalThis.React = React;

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.CLERK_SECRET_KEY = 'sk_test_mock';
process.env.KIMI_API_KEY = 'mock-kimi-key';

// Mock fetch globally
global.fetch = vi.fn();

// Provide a deterministic storage implementation for sandboxed and CI runs
// where jsdom-backed localStorage may be unavailable.
const createStorageMock = () => {
  let store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store = new Map<string, string>();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
};

const storageMock = createStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    configurable: true,
  });
}
 
// Mock IntersectionObserver with a constructible implementation for next/link.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
