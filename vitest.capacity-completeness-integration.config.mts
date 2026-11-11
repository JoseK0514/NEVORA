import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},
 test:{include:[
  'src/test/integration/clocker-capacity-completeness.integration.ts',
  'src/test/integration/payroll-client-projection.integration.ts',
  'src/test/integration/clocker-timecards.integration.ts',
  'src/test/integration/clocker-time-corrections.integration.ts',
  'src/test/integration/clocker-action-center.integration.ts',
 ],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
});
