import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('company-access-integration', defineConfig({
 test:{include:['src/test/integration/company-access-*.integration.ts'],exclude:['src/test/integration/company-access-shift-changes.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000}}));
