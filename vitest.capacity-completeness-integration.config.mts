import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('capacity-completeness-integration', defineConfig({
 test:{include:[
  'src/test/integration/clocker-capacity-completeness.integration.ts',
  'src/test/integration/clocker-payroll-client-projection.integration.ts',
  'src/test/integration/clocker-timecards.integration.ts',
  'src/test/integration/clocker-time-corrections.integration.ts',
  'src/test/integration/clocker-action-center.integration.ts',
 ],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
}));
