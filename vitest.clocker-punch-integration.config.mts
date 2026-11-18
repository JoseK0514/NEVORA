import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
import clocker from './vitest.clocker-integration.config.mts';
export default projectConfig('clocker-punch-integration', defineConfig({ ...clocker, test: { ...clocker.test,
 include:['src/test/integration/clocker-punch*.integration.ts'],
} }));
