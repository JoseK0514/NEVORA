import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 resolve:{alias:{'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url)),'@':fileURLToPath(new URL('./src',import.meta.url))}},
 test:{include:['src/test/integration/fresh-company-setup.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000},
});
