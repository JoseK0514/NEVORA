import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('premium-release-integration', defineConfig({
  test: {
    include: ['src/test/integration/premium-*.integration.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
}));
