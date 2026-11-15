import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('reports-integration', defineConfig({test:{include:['src/test/integration/clocker-reports.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
