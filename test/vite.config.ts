import { defineConfig } from 'vitest/config';

export const BASE_URL = 'http://localhost:5000';

export default defineConfig({
  test: {
    silent: false,
    environment: 'node',
    include: ['./**/*.test.ts'],
  },
});
