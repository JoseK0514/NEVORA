import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('phase-d-remediation', defineConfig({
  test: { include:['src/test/integration/clocker-phase-d-remediation.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000 },
}));
