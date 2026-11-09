import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:['src/test/integration/clocker-recovery-review.integration.ts','src/test/integration/clocker-punches.integration.ts'],fileParallelism:false,testTimeout:15000,hookTimeout:30000}});
