import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/test/integration/generation-provenance.integration.ts', 'src/test/integration/schedule-generation.integration.ts', 'src/test/integration/generation-cross-layer.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
});
