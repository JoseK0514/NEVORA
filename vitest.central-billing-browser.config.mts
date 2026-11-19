import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('central-billing-browser', defineConfig({test:{include:['src/test/integration/central-billing-browser.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:240000,hookTimeout:30000}}));
