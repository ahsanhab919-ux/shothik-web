import { defineConfig } from 'vitest/config';
import path from 'path';

const validationNoiseExcludes = [
  'brainstom /**',
  '.testsprite-home/**',
  'testsprite_tests/**',
];

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    pool: 'forks', // Prevents React 19 hook issues across files in JSDOM
    include: [
      '**/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}',
      '**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      'e2e/**',
      ...validationNoiseExcludes,
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
      watermarks: {
        lines: [40, 80],
        functions: [40, 75],
        branches: [30, 70],
        statements: [40, 80],
      },
      exclude: [
        'node_modules/',
        '.next/',
        ...validationNoiseExcludes,
        '**/*.d.ts',
        '**/*.config.*',
        '**/mock/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
