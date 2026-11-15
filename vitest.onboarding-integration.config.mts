import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
const suite=process.env.NEVORA_ONBOARDING_TEST_SUITE;
if(!suite)throw Error('Use scripts/onboarding-owned.mjs; existing database targets are not permitted.');
export default projectConfig('onboarding-integration', defineConfig({test:{include:[suite==='all'?'src/test/integration/onboarding-*.integration.ts':`src/test/integration/onboarding-${suite}.integration.ts`],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:60000}}));
