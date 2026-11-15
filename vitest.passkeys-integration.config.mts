import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('passkeys-integration', defineConfig({
  test: { include: ["src/test/integration/passkeys*.integration.ts"], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 },
}));
