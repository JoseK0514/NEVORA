import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('staff-tasks-integration', defineConfig({test:{include:['src/test/integration/staff-tasks.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}}));
