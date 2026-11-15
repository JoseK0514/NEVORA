import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('delegated-corrections-browser', defineConfig({test:{include:['src/test/integration/delegated-corrections-browser.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:360000,hookTimeout:30000}}));
