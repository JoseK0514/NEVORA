import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('generation-integration', defineConfig({
  test: { include: ['src/test/integration/generation-provenance.integration.ts', 'src/test/integration/schedule-generation.integration.ts', 'src/test/integration/generation-cross-layer.integration.ts', 'src/test/integration/generation-session.integration.ts', 'src/test/integration/scheduling-restrictions.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
