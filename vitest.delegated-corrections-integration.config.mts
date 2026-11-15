import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('delegated-corrections-integration', defineConfig({test:{include:['src/test/integration/clocker-delegated-corrections.integration.ts','src/test/integration/clocker-time-corrections.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:15000,hookTimeout:30000}}));
