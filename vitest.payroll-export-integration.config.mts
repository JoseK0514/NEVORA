import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';export default projectConfig('payroll-export-integration', defineConfig({test:{include:['src/test/integration/clocker-payroll-export.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
