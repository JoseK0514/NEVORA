import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('generation-integration', defineConfig({
  test: { include: ['src/test/integration/generation-provenance.integration.ts', 'src/test/integration/schedule-generation.integration.ts', 'src/test/integration/generation-cross-layer.integration.ts', 'src/test/integration/generation-session.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
