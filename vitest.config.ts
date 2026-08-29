import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./tests/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'tests/toolchain/**'],
      restoreMocks: true,
      clearMocks: true,
      coverage: { reporter: ['text', 'json-summary', 'html'] },
    },
  }),
);
