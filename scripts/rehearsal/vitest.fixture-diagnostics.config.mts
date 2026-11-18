import { defineConfig } from '../../vitest.shared.mts';
import {projectConfig} from '../../vitest.shared.mts';
export default projectConfig('rehearsal-fixture-diagnostics',defineConfig({
  test: { include: ['scripts/rehearsal/fixture-diagnostics.integration.ts'], setupFiles: ['scripts/rehearsal/fixture-diagnostics.setup.ts'],
    fileParallelism: false, testTimeout: 120000, hookTimeout: 30000 },
}));
