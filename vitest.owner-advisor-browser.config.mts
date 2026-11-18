import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('owner-advisor-browser', defineConfig({
  test: {
    include: ["src/test/integration/claude-business-ui-browser.integration.ts", "src/test/integration/owner-advisor-business-answer-browser.integration.ts", "src/test/integration/owner-advisor-business-browser.integration.ts", "src/test/integration/owner-advisor-browser.integration.ts", "src/test/integration/owner-advisor-notebook-browser.integration.ts", "src/test/integration/owner-advisor-coverage-plan-browser.integration.ts", "src/test/integration/owner-advisor-coverage-actions-browser.integration.ts", "src/test/integration/owner-advisor-knowledge-browser.integration.ts", "src/test/integration/owner-advisor-weekly-browser.integration.ts", "src/test/integration/owner-advisor-knowledge-ui-browser.integration.ts", "src/test/integration/owner-advisor-weekly-off-browser.integration.ts"],
    fileParallelism: false,
    maxWorkers: 2,
    testTimeout: 240000,
    hookTimeout: 30000,
  },
}));
