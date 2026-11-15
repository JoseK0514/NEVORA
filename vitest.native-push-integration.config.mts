import {projectConfig} from './vitest.shared.mts';
import {defineConfig} from 'vitest/config';
export default projectConfig('native-push-integration', defineConfig({
  test: {include: ['src/test/integration/native-push.integration.ts', 'src/test/integration/native-deliveries.integration.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000},
}));
