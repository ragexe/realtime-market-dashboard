import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'wasm',
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
});
