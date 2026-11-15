import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('rondo-leadership', defineConfig({test:{include:['src/test/integration/rondo-leadership.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:30000}}));
