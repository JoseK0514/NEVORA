import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('payroll-client-projection-integration', defineConfig({
 test:{include:['src/test/integration/clocker-payroll-client-projection.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
}));
