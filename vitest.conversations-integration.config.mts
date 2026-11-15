import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('conversations-integration', defineConfig({test:{include:['src/test/integration/conversations.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000}}));
