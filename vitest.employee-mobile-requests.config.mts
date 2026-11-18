import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('employee-mobile-requests', defineConfig({test:{include:['src/test/integration/employee-mobile-requests.integration.ts','src/test/integration/shift-change-hardening.integration.ts','src/test/integration/shift-change-views.integration.ts'],fileParallelism:false,testTimeout:600000,hookTimeout:30000,passWithNoTests:false}}));
