import {projectConfig} from './vitest.shared.mts';
import { defineConfig } from "vitest/config";
export default projectConfig('owner-advisor-live', defineConfig({
  test: { include: ["src/lib/owner-advisor/quality.live.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 90000, hookTimeout: 30000 },
}));
