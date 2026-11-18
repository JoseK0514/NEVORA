import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
import { clockerTest } from './vitest.clocker-integration.config.mts';
export default projectConfig('clocker-punch-integration', defineConfig({ ...clockerTest, test: { ...clockerTest.test,
 include:['src/test/integration/clocker-punch*.integration.ts'],
} }));
