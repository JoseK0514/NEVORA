import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('premium-load', defineConfig({
  test: { include: ['src/test/integration/premium-load.probe.ts'], fileParallelism: false, testTimeout: 900000, hookTimeout: 30000 },
}));
