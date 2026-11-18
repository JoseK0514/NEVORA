import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('owner-inbox-browser', defineConfig({test:{include:['src/test/integration/owner-inbox-browser.integration.ts'],fileParallelism:false,testTimeout:600000,passWithNoTests:false}}));
