import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},
  test:{include:['src/test/integration/all-ui-browser.integration.ts','src/test/integration/quick-wins-ui-browser.integration.ts'],fileParallelism:false,testTimeout:240000,hookTimeout:30000},
});
