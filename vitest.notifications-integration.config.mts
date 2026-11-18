import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from './vitest.shared.mts';
export default projectConfig('notifications-integration', defineConfig({
  test: { include: ['src/test/integration/notifications.integration.ts','src/test/integration/owned-migration-diagnostics.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
