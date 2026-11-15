import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('premium-submissions', defineConfig({
  test: { include: ['src/test/integration/premium-submissions.probe.ts'], fileParallelism: false, testTimeout: 900000, hookTimeout: 30000 },
}));
