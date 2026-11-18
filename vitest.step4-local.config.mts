import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('step4-local', defineConfig({test:{include:['src/test/integration/step4-lifecycle-browser.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:900000,hookTimeout:60000}}));
