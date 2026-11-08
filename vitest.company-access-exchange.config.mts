import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
// This suite explicitly requests the exchange disposable fixture. Keep its
// prefix separate from the foundation Company Access runner, without weakening
// the fixture's refusal of an existing/wrong-mode database.
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},test:{include:['src/test/integration/company-access-shift-changes.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000}});
