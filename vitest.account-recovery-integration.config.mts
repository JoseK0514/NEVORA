import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('account-recovery-integration', defineConfig({test:{include:['src/test/integration/clocker-account-recovery.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}}));
