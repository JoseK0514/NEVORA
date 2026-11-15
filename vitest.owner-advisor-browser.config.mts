import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('owner-advisor-browser', defineConfig({
  test: {
    include: ["src/test/integration/owner-advisor-browser.integration.ts", "src/test/integration/owner-advisor-notebook-browser.integration.ts", "src/test/integration/owner-advisor-coverage-plan-browser.integration.ts", "src/test/integration/owner-advisor-coverage-actions-browser.integration.ts"],
    fileParallelism: false,
    maxWorkers: 2,
    testTimeout: 240000,
    hookTimeout: 30000,
  },
}));
