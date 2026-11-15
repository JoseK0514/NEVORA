import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('passkeys-network', defineConfig({
  test: { include: ["src/test/integration/passkey-network.integration.ts"], fileParallelism: false, testTimeout: 180000, hookTimeout: 180000 },
}));
