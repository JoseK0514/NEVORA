import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:['src/test/integration/mobile-access-browser.integration.ts','src/test/integration/mobile-onboarding-ui.integration.tsx'],fileParallelism:false,testTimeout:360000,hookTimeout:30000}});
