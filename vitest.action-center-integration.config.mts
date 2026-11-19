import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('action-center-integration', defineConfig({test:{include:['src/test/integration/clocker-action-center.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
