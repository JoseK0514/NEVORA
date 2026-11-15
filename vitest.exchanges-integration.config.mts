import {projectConfig} from './vitest.shared.mts';
import { defineConfig, configDefaults } from 'vitest/config';
export default projectConfig('exchanges-integration', defineConfig({
 // company-access-shift-changes belongs to vitest.company-access-integration.config.mts:
 // its fixture provisions a nevora_foundation_test_* database, while this suite's
 // FUEL_TEST_DATABASE_URL must use the nevora_exchange_test_* prefix.
 test: { include: ['src/test/integration/*shift-change*.integration.ts'], exclude: [...configDefaults.exclude, 'src/test/integration/company-access-*.integration.ts'], fileParallelism:false,testTimeout:15000,hookTimeout:30000 },
}));
