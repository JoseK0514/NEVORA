import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:['src/test/integration/phase-e-home.integration.ts','src/test/integration/phase-e-published-assignments.integration.ts','src/test/integration/clocker-employee-schedule.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000,passWithNoTests:false}});
