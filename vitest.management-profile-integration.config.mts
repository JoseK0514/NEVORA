import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('management-profile-integration', defineConfig({test:{include:['src/test/integration/management-profile.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}}));
