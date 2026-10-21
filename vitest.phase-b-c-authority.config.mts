import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)) } },
  test: {
    include: [
      'src/test/integration/phase-b-late-write-session.integration.ts',
      'src/test/integration/phase-b-analogous-expiry.integration.ts',
      'src/test/integration/phase-b-final-boundaries.integration.ts',
    ],
    setupFiles: ['src/test/integration/phase-b-c-authority.setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
