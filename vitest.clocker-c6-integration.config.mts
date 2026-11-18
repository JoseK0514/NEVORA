import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('clocker-c6-integration', defineConfig({
  test: {
    include: ['src/test/integration/clocker-schedule-*.integration.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
}));
