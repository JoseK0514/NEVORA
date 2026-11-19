import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('clocker-breaks-integration', defineConfig({
  test: { include: ['src/test/integration/clocker-break*.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
