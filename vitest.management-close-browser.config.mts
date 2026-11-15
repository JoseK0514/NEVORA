import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('management-close-browser', defineConfig({
  test:{include:['src/test/integration/management-close-browser.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:240000,hookTimeout:30000},
}));
