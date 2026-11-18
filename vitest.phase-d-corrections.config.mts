import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('phase-d-corrections', defineConfig({
  test: {
    include: ['src/test/integration/clocker-time-corrections.integration.ts', 'src/test/integration/clocker-missing-time-supersession.integration.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
}));
