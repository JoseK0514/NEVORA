import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
 test:{include:['src/test/integration/company-access-*.integration.ts'],exclude:['src/test/integration/company-access-shift-changes.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000}});
