import { projectConfig } from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('rondo-management-anthropic', defineConfig({ test: {
  include: ['src/test/integration/rondo-management-anthropic.live.ts'],
  fileParallelism: false, maxWorkers: 1, testTimeout: 300000, hookTimeout: 30000,
} }));
