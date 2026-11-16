import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('all-ui-browser', defineConfig({
  test:{include:['src/test/integration/operator-password-browser.integration.ts','src/test/integration/all-ui-browser.integration.ts','src/test/integration/quick-wins-ui-browser.integration.ts','src/test/integration/readiness-ui-browser.integration.ts'],fileParallelism:false,testTimeout:240000,hookTimeout:30000},
}));
