import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('configurable-payroll-integration', defineConfig({
  test: {
    include: ["src/test/integration/configurable-payroll.integration.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
}));
