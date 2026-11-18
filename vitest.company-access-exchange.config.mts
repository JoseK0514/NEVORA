import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
// This suite explicitly requests the exchange disposable fixture. Keep its
// prefix separate from the foundation Company Access runner, without weakening
// the fixture's refusal of an existing/wrong-mode database.
export default projectConfig('company-access-exchange', defineConfig({test:{include:['src/test/integration/company-access-shift-changes.integration.ts'],fileParallelism:false,testTimeout:20000,hookTimeout:30000}}));
