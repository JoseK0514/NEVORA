import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from 'vitest/config';
export default projectConfig('phase-b-c-authority', defineConfig({
  test: {
    include: [
      'src/test/integration/phase-b-late-write-session.integration.ts',
      'src/test/integration/phase-b-analogous-expiry.integration.ts',
      'src/test/integration/phase-b-final-boundaries.integration.ts',
    ],
    setupFiles: ['src/test/integration/phase-b-c-authority.setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
}));
