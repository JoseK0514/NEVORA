import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:['src/test/integration/employee-mobile-deletion-sql.integration.ts'],fileParallelism:false,maxWorkers:1,testTimeout:15000,hookTimeout:30000}});
