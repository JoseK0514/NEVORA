import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('owner-advisor-resilience-live', defineConfig({
  test: { include: ["src/test/integration/owner-advisor-resilience.live.ts"], fileParallelism: false, maxWorkers: 1, bail: 1, testTimeout: 150000, hookTimeout: 30000 },
}));
