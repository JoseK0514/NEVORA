import base from './vitest.owner-advisor-integration.config.mts';
import {defineConfig} from 'vitest/config';
export default defineConfig({...base,test:{...base.test,include:['src/test/integration/owner-advisor-partner-evaluation.live.ts'],fileParallelism:false,maxWorkers:1,bail:1,testTimeout:150000,hookTimeout:30000}});
