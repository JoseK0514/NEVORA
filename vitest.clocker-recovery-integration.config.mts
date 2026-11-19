import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('clocker-recovery-integration', defineConfig({test:{include:['src/test/integration/clocker-recovery-review.integration.ts','src/test/integration/clocker-punches.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
