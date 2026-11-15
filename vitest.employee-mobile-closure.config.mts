import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('employee-mobile-closure', defineConfig({test:{include:['src/test/integration/employee-mobile-closure.integration.ts'],fileParallelism:false,testTimeout:600000,hookTimeout:30000,passWithNoTests:false}}));
