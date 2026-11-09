import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
const suite=process.env.NEVORA_ONBOARDING_TEST_SUITE;
if(!suite)throw Error('Use scripts/onboarding-owned.mjs; existing database targets are not permitted.');
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:[suite==='all'?'src/test/integration/onboarding-*.integration.ts':`src/test/integration/onboarding-${suite}.integration.ts`],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:60000}});
