import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)) } },
  test: { include: ["src/test/integration/owner-advisor-resilience.live.ts"], fileParallelism: false, maxWorkers: 1, bail: 1, testTimeout: 150000, hookTimeout: 30000 },
});
