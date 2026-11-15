import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('timecards-integration', defineConfig({
  test: { include:['src/test/integration/clocker-timecards.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000 },
}));
