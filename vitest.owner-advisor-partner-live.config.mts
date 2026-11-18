import {projectConfig} from './vitest.shared.mts';
import base from './vitest.owner-advisor-integration.config.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('owner-advisor-partner-live', defineConfig({...base,test:{...base.test,include:['src/test/integration/owner-advisor-partner-evaluation.live.ts'],fileParallelism:false,maxWorkers:1,bail:1,testTimeout:150000,hookTimeout:30000}}));
