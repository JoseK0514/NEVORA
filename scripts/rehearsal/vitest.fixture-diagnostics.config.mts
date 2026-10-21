import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)),
    'server-only': fileURLToPath(new URL('../../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)) } },
  test: { include: ['scripts/rehearsal/fixture-diagnostics.integration.ts'], setupFiles: ['scripts/rehearsal/fixture-diagnostics.setup.ts'],
    fileParallelism: false, testTimeout: 120000, hookTimeout: 30000 },
});
