import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('employee-schedule-integration', defineConfig({test:{include:['src/test/integration/clocker-employee-schedule.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
