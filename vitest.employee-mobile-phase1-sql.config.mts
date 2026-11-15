import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('employee-mobile-phase1-sql', defineConfig({test:{include:['src/test/integration/phase-e-home.integration.ts','src/test/integration/phase-e-published-assignments.integration.ts','src/test/integration/clocker-employee-schedule.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000,passWithNoTests:false}}));
