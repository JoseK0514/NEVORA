import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('six-findings', defineConfig({
  test: {
    include: ["src/test/integration/six-findings.integration.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
}));
