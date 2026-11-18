import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('owner-advisor-integration', defineConfig({
  test: {
    include: ["src/lib/owner-advisor/*.integration.ts", "src/lib/owner-advisor/business/*.integration.ts"],
    fileParallelism: false,
    maxWorkers: 2,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
}));
