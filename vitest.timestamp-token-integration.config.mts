import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('timestamp-token-integration', defineConfig({test:{include:['src/test/integration/employee-mobile-deletion-sql.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:15000,hookTimeout:30000}}));
