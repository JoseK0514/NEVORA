import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('native-payroll-integration', defineConfig({
  test: {
    include: ["src/test/integration/payroll-native.integration.ts","src/test/integration/payroll-replacement-context.integration.ts","src/test/integration/payroll-overlap.integration.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
}));
