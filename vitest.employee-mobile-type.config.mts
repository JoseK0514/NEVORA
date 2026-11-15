import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('employee-mobile-type', defineConfig({test:{include:['src/test/integration/employee-mobile-type.integration.tsx'],fileParallelism:false,testTimeout:60000,passWithNoTests:false}}));
