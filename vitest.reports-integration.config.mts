import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('reports-integration', defineConfig({test:{include:['src/test/integration/clocker-reports.integration.ts','src/test/integration/christmas-bonus.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
