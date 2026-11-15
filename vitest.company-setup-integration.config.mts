import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('company-setup-integration', defineConfig({
 test:{include:['src/test/integration/fresh-company-setup.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
}));
