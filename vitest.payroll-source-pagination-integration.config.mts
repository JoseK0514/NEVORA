import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('payroll-source-pagination-integration', defineConfig({
 test:{include:['src/test/integration/payroll-source-pagination.integration.ts','src/test/integration/payroll-timestamp-compatibility.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
}));
