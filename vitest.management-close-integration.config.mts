import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('management-close-integration', defineConfig({
  test:{include:['src/test/integration/clocker-management-close.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:15000,hookTimeout:30000},
}));
