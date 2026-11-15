import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('punches-integration', defineConfig({
  test: { include: ['src/test/integration/clocker-punch*.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
