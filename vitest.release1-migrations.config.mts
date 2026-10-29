import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:['src/test/migration-order.test.ts','src/test/integration/fresh-company-setup.integration.ts','src/test/integration/release1-migrations.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000,passWithNoTests:false}});
