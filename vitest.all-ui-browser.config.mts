import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('all-ui-browser', defineConfig({
  test:{include:['src/test/integration/location-retirement-type-browser.integration.ts','src/test/integration/development-active-shift-browser.integration.ts','src/test/integration/development-export-recovery.integration.ts','src/test/integration/development-payroll-lifetime.integration.ts','src/test/integration/claude-ui-joined-browser.integration.ts','src/test/integration/operator-password-browser.integration.ts','src/test/integration/all-ui-browser.integration.ts','src/test/integration/quick-wins-ui-browser.integration.ts','src/test/integration/readiness-ui-browser.integration.ts','src/test/integration/readiness-shift-concurrency-browser.integration.ts'],fileParallelism:false,testTimeout:240000,hookTimeout:30000},
}));
