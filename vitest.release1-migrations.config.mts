import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from './vitest.shared.mts';
export default projectConfig('release1-migrations', defineConfig({test:{include:['src/test/migration-order.test.ts','src/test/integration/fresh-company-setup.integration.ts','src/test/integration/release1-migrations.integration.ts'],fileParallelism:false,testTimeout:30000,hookTimeout:30000,passWithNoTests:false}}));
