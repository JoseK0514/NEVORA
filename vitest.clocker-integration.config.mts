import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('clocker-integration', defineConfig({
  test: { include: ['src/test/integration/clocker-*.integration.ts', 'src/test/integration/phase-c-release-migrations.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
